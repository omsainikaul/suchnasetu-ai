import pytest
import os
import re
from fastapi.testclient import TestClient
from app.main import app
from app.services.ocr_service import ocr_service
from app.services.evidence_service import evidence_service
from app.services.gemma_adapter import gemma_adapter
from app.schemas.models import FieldStatus

client = TestClient(app)

SAMPLE_IMAGE_PATH = os.path.join(os.path.dirname(__file__), "../../samples/scholarship_notice_2026.png")

@pytest.fixture(scope="module")
def ocr_sample_text():
    """Extract raw OCR text from the actual scholarship notice image."""
    with open(SAMPLE_IMAGE_PATH, "rb") as f:
        img_bytes = f.read()
    res = ocr_service.extract_text(img_bytes)
    return res.text, res.confidence

def test_actual_sample_ocr_entity_grounding(ocr_sample_text):
    """
    Verify that the actual scholarship notice image contains the true ground truth entities:
    - Deadline: before sunset on 15/11/2026 (NOT 5:00 PM!)
    - Email: helpdesk.scholarship@uphe.gov.in (NOT scholarship@up.gov.in!)
    - Location: Room 104, Administrative Block (NOT Room 12!)
    - Eligibility: 65% aggregate (or 6.5 CGPA)
    - Omission: Income certificate explicitly omitted.
    """
    text, conf = ocr_sample_text
    assert conf > 0.85

    entities = evidence_service.extract_source_entities(text)

    # 1. Email check
    assert "helpdesk.scholarship@uphe.gov.in" in entities["emails"]
    assert "scholarship@up.gov.in" not in entities["emails"]

    # 2. Date check
    assert "15/11/2026" in entities["dates"]

    # 3. Room & Location check
    assert "104" in entities["rooms"]
    assert "12" not in entities["rooms"]
    assert "administrative block" in entities["offices"]

    # 4. Cutoff check
    assert "sunset" in entities["ambiguous_cutoffs"]

    # 5. Percentage check
    assert any("65%" in p for p in entities["percentages"])

    # 6. Omission check
    assert any("omitted" in l.lower() for l in entities["omitted_topics"])

def test_deterministic_evaluator_preserves_actual_entities(ocr_sample_text):
    """
    Verify that the deterministic evaluation adapter extracts the true entities
    directly from the actual scholarship notice OCR text without assuming old sample text.
    """
    text, _ = ocr_sample_text
    parsed = gemma_adapter._deterministic_grounded_analysis(text, language="en", reading_level="standard")

    fields = parsed["fields"]

    # Contact email must be helpdesk.scholarship@uphe.gov.in
    assert "helpdesk.scholarship@uphe.gov.in" in fields["contact"]["value"]

    # Action must mention Room 104
    assert "104" in fields["action"]["value"]

    # Deadline must contain 15/11/2026 and sunset
    assert "15/11/2026" in fields["deadline"]["value"]
    assert "sunset" in fields["deadline"]["value"].lower()

    # Documents must NOT include the omitted income certificate
    docs = fields["required_documents"]["value"]
    assert isinstance(docs, list)
    assert not any("income certificate" in str(d).lower() for d in docs)
    assert any("card" in str(d).lower() or "aadhaar" in str(d).lower() for d in docs)
    assert any("passbook" in str(d).lower() for d in docs)

def test_rejection_of_hallucinated_email(ocr_sample_text):
    """
    If a model (or mock) injects an unsupported email (e.g. scholarship@up.gov.in or fake@test.com),
    the deterministic calibration layer must flag needs_confirmation and calibrate to genuine source email.
    """
    text, conf = ocr_sample_text
    mock_raw_fields = {
        "contact": {
            "value": "State Scholarship Helpline: scholarship@up.gov.in or 0522-2239401",
            "status": "found",
            "evidence": ["Scholarship Cell Helpline: 0522-2239 401 /0522-2239 402 IOfficial Emai: helpdesk.scholarship@uphe.gov.in"]
        }
    }

    calibrated = evidence_service.validate_and_calibrate_fields(mock_raw_fields, text, conf, "en")
    contact = calibrated["contact"]

    # Must flag needs_confirmation because scholarship@up.gov.in is unsupported by the notice
    assert contact.status == FieldStatus.NEEDS_CONFIRMATION
    assert "scholarship@up.gov.in" in contact.uncertainty_reason
    # Must calibrate value to the genuine verified email from the notice
    assert "helpdesk.scholarship@uphe.gov.in" in contact.value

def test_rejection_of_hallucinated_room_location(ocr_sample_text):
    """
    If a model outputs Room 12 instead of Room 104,
    the deterministic check must flag needs_confirmation and calibrate.
    """
    text, conf = ocr_sample_text
    mock_raw_fields = {
        "action": {
            "value": "Submit physical dossier in duplicate to Room 12, Administrative Block.",
            "status": "found",
            "evidence": ["Dean of Stude nt We lfare, and submit physical dossier in duplicate to Room 104. Administrative Block."]
        }
    }

    calibrated = evidence_service.validate_and_calibrate_fields(mock_raw_fields, text, conf, "en")
    action = calibrated["action"]

    assert action.status == FieldStatus.NEEDS_CONFIRMATION
    assert "12" in action.uncertainty_reason
    assert "104" in action.value

def test_rejection_of_fabricated_deadline_time(ocr_sample_text):
    """
    If a model outputs '15 November 2026 at 5:00 PM' when the notice says 'before sunset on 15/11/2026',
    it must trigger needs_confirmation.
    """
    text, conf = ocr_sample_text
    mock_raw_fields = {
        "deadline": {
            "value": "15/11/2026 at 5:00 PM",
            "status": "found",
            "evidence": ["All complete application dossiers must reach the scholarship cell before sunseton 15/11/2026."]
        }
    }

    calibrated = evidence_service.validate_and_calibrate_fields(mock_raw_fields, text, conf, "en")
    deadline = calibrated["deadline"]

    assert deadline.status == FieldStatus.NEEDS_CONFIRMATION
    assert "5:00 PM" in deadline.uncertainty_reason or "sunset" in deadline.uncertainty_reason

def test_rejection_of_fabricated_document(ocr_sample_text):
    """
    If a model hallucinates an Income Certificate or Caste Certificate when omitted from the notice,
    the validator must prune it from required_documents and flag uncertainty.
    """
    text, conf = ocr_sample_text
    mock_raw_fields = {
        "required_documents": {
            "value": [
                "College Bonafide Student Identity Card copy",
                "Aadhaar Card copy",
                "Parent Income Certificate (competent authority issued)"
            ],
            "status": "found",
            "evidence": ["3. REQUIRED DOCUMENTS TO BE ATTACHED."]
        }
    }

    calibrated = evidence_service.validate_and_calibrate_fields(mock_raw_fields, text, conf, "en")
    docs_field = calibrated["required_documents"]

    # Parent Income Certificate must be pruned!
    assert not any("Income Certificate" in str(d) for d in docs_field.value)
    assert len(docs_field.value) == 2
    assert docs_field.status == FieldStatus.NEEDS_CONFIRMATION
    assert "omitted" in docs_field.uncertainty_reason.lower()

def test_rejection_of_fabricated_evidence_citation(ocr_sample_text):
    """
    If a model fabricates an evidence quotation that does not exist in the notice,
    the quotation must be pruned and the field flagged as needs_confirmation.
    """
    text, conf = ocr_sample_text
    mock_raw_fields = {
        "purpose": {
            "value": "Scholarship for all students",
            "status": "found",
            "evidence": ["This is a completely fabricated sentence that does not exist anywhere in the official circular."]
        }
    }

    calibrated = evidence_service.validate_and_calibrate_fields(mock_raw_fields, text, conf, "en")
    purpose = calibrated["purpose"]

    # Fabricated evidence must be completely removed!
    assert len(purpose.evidence) == 0
    assert purpose.status == FieldStatus.NEEDS_CONFIRMATION
    assert "Supporting sentence could not be verified" in purpose.uncertainty_reason

def test_handling_of_low_ocr_confidence(ocr_sample_text):
    """Low OCR confidence (< 0.70) must calibrate fields to needs_confirmation."""
    text, _ = ocr_sample_text
    mock_raw_fields = {
        "purpose": {
            "value": "State Merit Scholarship Scheme",
            "status": "found",
            "evidence": ["State Merit Scholarship Sche me for Acade mic Year 2026-27."]
        }
    }

    calibrated = evidence_service.validate_and_calibrate_fields(mock_raw_fields, text, ocr_confidence=0.55, language="en")
    assert calibrated["purpose"].status == FieldStatus.NEEDS_CONFIRMATION
    assert "Low OCR image confidence" in calibrated["purpose"].uncertainty_reason

def test_english_hindi_factual_consistency(ocr_sample_text):
    """
    Verify that translating to Hindi maintains strict factual parity for:
    - Deadline date: 15/11/2026
    - Email: helpdesk.scholarship@uphe.gov.in
    - Room: Room 104
    - Phone: 0522-2239 401
    """
    text, conf = ocr_sample_text
    en_parsed = gemma_adapter._deterministic_grounded_analysis(text, language="en", reading_level="standard")
    hi_parsed = gemma_adapter._deterministic_grounded_analysis(text, language="hi", reading_level="standard")

    en_cal = evidence_service.validate_and_calibrate_fields(en_parsed["fields"], text, conf, "en")
    hi_cal = evidence_service.validate_and_calibrate_fields(hi_parsed["fields"], text, conf, "hi")

    # Dates
    assert "15/11/2026" in str(en_cal["deadline"].value)
    assert "15/11/2026" in str(hi_cal["deadline"].value)

    # Email
    assert "helpdesk.scholarship@uphe.gov.in" in str(en_cal["contact"].value)
    assert "helpdesk.scholarship@uphe.gov.in" in str(hi_cal["contact"].value)

    # Room
    assert "104" in str(en_cal["action"].value)
    assert "104" in str(hi_cal["action"].value)

def test_qa_absent_requirements_and_evidence_pruning(ocr_sample_text):
    """
    Test negative questions:
    - Absent topic (e.g. hostel fee) -> is_stated_in_notice: False, not_stated_in_notice, no fake citations.
    - Explicitly omitted topic (e.g. parent income limit) -> cites actual omission clause.
    """
    text, _ = ocr_sample_text

    # 1. Absent requirement not mentioned at all
    qa_hostel = gemma_adapter._deterministic_grounded_qa(text, "What is the hostel accommodation fee?", "en")
    val_hostel = evidence_service.validate_qa_response(qa_hostel, text, "en")
    assert val_hostel["is_stated_in_notice"] is False
    assert val_hostel["status"] == "not_stated_in_notice"
    assert val_hostel["evidence"] == []
    assert "not stated" in val_hostel["answer"].lower()
    # Must NOT claim deliberate omission when topic wasn't mentioned
    assert "deliberately omitted" not in val_hostel["answer"].lower()

    # 2. Topic explicitly mentioned as omitted
    qa_income = gemma_adapter._deterministic_grounded_qa(text, "Is an income certificate required?", "en")
    val_income = evidence_service.validate_qa_response(qa_income, text, "en")
    assert val_income["is_stated_in_notice"] is False
    assert val_income["status"] == "not_stated_in_notice"
    assert len(val_income["evidence"]) == 1
    assert "omitted" in val_income["evidence"][0].lower()

def test_qa_rejects_hallucinated_true_claim(ocr_sample_text):
    """
    If a model claims is_stated_in_notice: True with a hallucinated quotation,
    validate_qa_response must reject it and return is_stated_in_notice: False.
    """
    text, _ = ocr_sample_text
    hallucinated_qa = {
        "answer": "The submission deadline is strictly 5:00 PM at Room 12.",
        "is_stated_in_notice": True,
        "status": "answered_from_notice",
        "evidence": ["All candidates must assemble at Room 12 by 5:00 PM sharp."]
    }

    validated = evidence_service.validate_qa_response(hallucinated_qa, text, "en")
    assert validated["is_stated_in_notice"] is False
    assert validated["status"] == "not_stated_in_notice"
    assert validated["evidence"] == []
    assert "not stated in the supplied notice" in validated["answer"]

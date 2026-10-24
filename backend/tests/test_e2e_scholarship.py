import io
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.ocr_service import ocr_service
from app.schemas.models import FieldStatus

client = TestClient(app)

SAMPLE_PNG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../samples/scholarship_notice_2026.png"))

def test_e2e_scholarship_image_ocr_and_analysis():
    """
    Priority 2: End-to-end verification using the real scholarship sample image.
    1. Real RapidOCR text extraction.
    2. 6 structured fields extraction with evidence.
    3. Plain-language summary and ordered checklist.
    4. Missing-fields explicit labeling.
    5. Grounded Q&A rejection of absent requirement.
    6. Uncertainty confirmation preserving original value.
    7. Hindi language switching.
    """
    assert os.path.exists(SAMPLE_PNG_PATH), f"Sample notice image not found at {SAMPLE_PNG_PATH}"

    with open(SAMPLE_PNG_PATH, "rb") as f:
        image_bytes = f.read()

    assert len(image_bytes) > 0

    # Step 1: Real OCR extraction
    ocr_res = ocr_service.extract_text(image_bytes)
    assert len(ocr_res.text) > 100
    assert ocr_res.confidence >= 0.85
    assert len(ocr_res.lines) >= 20
    assert "SCHOLARSHIP" in ocr_res.text.upper()

    # Step 2: Full Analysis via API
    resp = client.post(
        "/api/analyze",
        files={"file": ("scholarship_notice_2026.png", image_bytes, "image/png")},
        data={"language": "en", "reading_level": "standard"}
    )
    assert resp.status_code == 200, f"Analysis failed: {resp.text}"
    data = resp.json()

    doc_id = data["document_id"]
    assert doc_id.startswith("doc_")
    assert data["source_type"] == "image"
    assert data["ocr_confidence"] >= 0.85

    # Step 3: Verify all 6 mandatory structured fields
    fields = data["fields"]
    mandatory_fields = ["purpose", "eligibility", "deadline", "required_documents", "contact", "action"]
    for mf in mandatory_fields:
        assert mf in fields, f"Missing mandatory field {mf}"
        field_obj = fields[mf]
        assert "value" in field_obj
        assert "status" in field_obj
        assert "evidence" in field_obj
        # Verify supporting evidence citations exist
        if field_obj["status"] in ("found", "needs_confirmation"):
            assert len(field_obj["evidence"]) >= 1, f"Expected citation for {mf}"

    # Verify deadline value
    assert any(char.isdigit() for char in str(fields["deadline"]["value"]))

    # Step 4: Verify Plain-Language Summary & Ordered Checklist
    assert len(data["summary"]) > 50
    assert len(data["checklist"]) >= 2
    for item in data["checklist"]:
        assert item["step_number"] >= 1
        assert len(item["action"]) > 0
        assert "documents_needed" in item
        assert "evidence" in item

    # Step 5: Grounded Q&A - Absent requirement negative test
    # The scholarship notice says nothing about an "income certificate"
    absent_q = client.post(
        "/api/ask",
        json={
            "document_id": doc_id,
            "question": "Is an income certificate required or what is the parent annual income cap?",
            "language": "en"
        }
    )
    assert absent_q.status_code == 200
    absent_data = absent_q.json()
    assert absent_data["is_stated_in_notice"] is False
    assert absent_data["status"] == "not_stated_in_notice"
    assert any(term in absent_data["answer"].lower() for term in ["not stated", "omitted", "not required"])

    # Step 6: Uncertainty & Human-in-the-loop confirmation
    orig_deadline_val = fields["deadline"]["value"]
    conf_resp = client.post(
        "/api/confirm",
        json={
            "document_id": doc_id,
            "field_key": "deadline",
            "confirmed_value": "15 November 2026, 5:00 PM"
        }
    )
    assert conf_resp.status_code == 200
    conf_data = conf_resp.json()
    assert conf_data["status"] == "confirmed"
    assert conf_data["original_value"] == orig_deadline_val
    assert conf_data["confirmed_value"] == "15 November 2026, 5:00 PM"

    # Verify updated session reflects user confirmation while keeping original value distinct
    session_resp = client.get(f"/api/document/{doc_id}")
    assert session_resp.status_code == 200
    session_data = session_resp.json()
    deadline_field = session_data["fields"]["deadline"]
    assert deadline_field["is_confirmed"] is True
    assert deadline_field["user_confirmed_value"] == "15 November 2026, 5:00 PM"
    assert deadline_field["value"] == orig_deadline_val  # Original value preserved!
    assert "deadline" in session_data["user_confirmations"]

    # Step 7: Language Switch to Hindi
    hi_resp = client.post(
        "/api/analyze",
        data={
            "text": ocr_res.text,
            "language": "hi",
            "reading_level": "standard"
        }
    )
    assert hi_resp.status_code == 200
    hi_data = hi_resp.json()
    assert hi_data["language"] == "hi"
    assert len(hi_data["summary"]) > 0
    # Check that Hindi checklist contains Devanagari actions
    assert any("आवेदन" in item["action"] or "दस्तावेज" in item["action"] or "जांच" in item["action"] for item in hi_data["checklist"])

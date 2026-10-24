import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_NOTICE_TEXT = """GOVERNMENT OF UTTAR PRADESH
HIGHER EDUCATION DEPARTMENT
CIRCULAR NO: 2026/ED/882

SUBJECT: POST-MATRIC MERIT SCHOLARSHIP 2026

1. PURPOSE:
Financial assistance is granted to enrolled degree students for 2026-27.

2. ELIGIBILITY:
Students enrolled in regular full-time degree programs with at least 65% marks.

3. REQUIRED DOCUMENTS:
Applicants must attach college bonafide certificate and last semester marksheet.

4. SUBMISSION DEADLINE:
All complete applications must be submitted by 15/11/2026.

5. HOW TO APPLY:
Submit printed application form at the College Scholarship Counter.

6. CONTACT:
Helpdesk: scholarship@up.gov.in or 0522-2239401."""

def test_hindi_english_fact_consistency():
    """Verify numbers, dates, contacts and documents are consistent between EN and HI."""
    # 1. Analyze in English
    en_resp = client.post("/api/analyze", data={"text": SAMPLE_NOTICE_TEXT, "language": "en"})
    assert en_resp.status_code == 200
    en_data = en_resp.json()

    # 2. Analyze in Hindi
    hi_resp = client.post("/api/analyze", data={"text": SAMPLE_NOTICE_TEXT, "language": "hi"})
    assert hi_resp.status_code == 200
    hi_data = hi_resp.json()

    # Deadline parity
    assert en_data["fields"]["deadline"]["value"] == hi_data["fields"]["deadline"]["value"]
    assert "15/11/2026" in str(hi_data["fields"]["deadline"]["value"])

    # Contact parity: email and phone numbers must remain identical
    assert "scholarship@up.gov.in" in str(en_data["fields"]["contact"]["value"])
    assert "scholarship@up.gov.in" in str(hi_data["fields"]["contact"]["value"])
    assert "0522-2239401" in str(en_data["fields"]["contact"]["value"])
    assert "0522-2239401" in str(hi_data["fields"]["contact"]["value"])

    # Eligibility condition parity (marks/percentage)
    assert "65%" in str(en_data["fields"]["eligibility"]["value"])
    assert "65%" in str(hi_data["fields"]["eligibility"]["value"])

    # Documents parity: count must match and official document terms are preserved
    assert len(en_data["fields"]["required_documents"]["value"]) == len(hi_data["fields"]["required_documents"]["value"])
    assert "bonafide" in str(hi_data["fields"]["required_documents"]["value"]).lower()
    assert "marksheet" in str(hi_data["fields"]["required_documents"]["value"]).lower()

    # Evidence preservation: original lines must NOT be fabricated or artificially translated
    for field_key in ["purpose", "eligibility", "deadline", "required_documents", "contact", "action"]:
        hi_ev = hi_data["fields"][field_key]["evidence"]
        en_ev = en_data["fields"][field_key]["evidence"]
        assert hi_ev == en_ev, f"Evidence mismatch for field {field_key}"

def test_hindi_grounded_qa():
    """Verify Hindi suggested questions and absent requirement rejection."""
    init_resp = client.post("/api/analyze", data={"text": SAMPLE_NOTICE_TEXT, "language": "hi"})
    doc_id = init_resp.json()["document_id"]

    # 1. Hindi query for deadline
    q1 = client.post("/api/ask", json={
        "document_id": doc_id,
        "question": "आवेदन की अंतिम तिथि क्या है?",
        "language": "hi"
    })
    assert q1.status_code == 200
    d1 = q1.json()
    assert d1["is_stated_in_notice"] is True
    assert "15/11/2026" in d1["answer"]
    assert len(d1["evidence"]) >= 1

    # 2. Hindi query for eligibility
    q2 = client.post("/api/ask", json={
        "document_id": doc_id,
        "question": "पात्रता मानदंड क्या हैं?",
        "language": "hi"
    })
    assert q2.status_code == 200
    d2 = q2.json()
    assert d2["is_stated_in_notice"] is True
    assert "65%" in d2["answer"]

    # 3. Hindi query for absent requirement (आय प्रमाण पत्र / income certificate)
    q3 = client.post("/api/ask", json={
        "document_id": doc_id,
        "question": "क्या आय प्रमाण पत्र अनिवार्य है?",
        "language": "hi"
    })
    assert q3.status_code == 200
    d3 = q3.json()
    assert d3["is_stated_in_notice"] is False
    assert d3["status"] == "not_stated_in_notice"
    assert "आवश्यकता नहीं है" in d3["answer"] or "उल्लेखित नहीं" in d3["answer"]

    # 4. Completely unmentioned qualifier (छात्रावास शुल्क / hostel fee)
    q4 = client.post("/api/ask", json={
        "document_id": doc_id,
        "question": "छात्रावास शुल्क कितना है?",
        "language": "hi"
    })
    assert q4.status_code == 200
    d4 = q4.json()
    assert d4["is_stated_in_notice"] is False
    assert d4["status"] == "not_stated_in_notice"

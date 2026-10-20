# SuchnaSetu AI — REST API Documentation
## PS 02 — Notice-to-Action Accessibility Assistant
**Base URL:** `http://localhost:8000/api`

---

### 1. Health Check
`GET /api/health`

Returns application operational status, active Gemma 4 model variant, model provider, and OCR engine readiness.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "project": "SuchnaSetu AI",
  "hindi_name": "सूचना + सेतु",
  "version": "1.0.0",
  "gemma_model": "google/gemma-4-31b-it",
  "model_provider": "openrouter",
  "ocr_ready": true,
  "live_inference_available": false
}
```

---

### 2. Public Configuration
`GET /api/config`

Returns frontend runtime settings, supported languages, reading levels, and file size limits.

**Response `200 OK`:**
```json
{
  "project_name": "SuchnaSetu AI",
  "hindi_name": "सूचना + सेतु",
  "gemma_model": "google/gemma-4-31b-it",
  "provider": "openrouter",
  "live_inference": false,
  "supported_languages": [
    { "code": "en", "name": "English" },
    { "code": "hi", "name": "हिंदी (Hindi)" }
  ],
  "reading_levels": [
    { "code": "standard", "label": "Standard", "label_hi": "मानक" },
    { "code": "simpler", "label": "Simpler / Easy Read", "label_hi": "सरल / आसान" }
  ],
  "max_upload_size_mb": 15
}
```

---

### 3. List Demo Notices
`GET /api/demo-notices`

Retrieves the pre-configured realistic synthetic notices demonstrating missing fields and ambiguous deadlines.

**Response `200 OK`:**
```json
[
  {
    "id": "demo-scholarship-2026",
    "title": "State Post-Matric Merit Scholarship Scheme 2026-27",
    "title_hi": "राज्य पोस्ट-मैट्रिक मेरिट छात्रवृत्ति योजना 2026-27",
    "category": "Educational Scholarship",
    "description": "Demonstrates missing income limit requirement and ambiguous deadline.",
    "sample_text": "...",
    "has_missing_field": true,
    "missing_field_name": "Family Income Certificate / Ceiling",
    "has_uncertain_field": true
  }
]
```

---

### 4. Analyze Notice
`POST /api/analyze`

Accepts either an uploaded notice image (via `multipart/form-data`) or pasted text (via form field). Processes through RapidOCR if an image is provided, calls Gemma 4, calibrates facts with the evidence verifier, and generates 6 structured fields and an ordered checklist.

**Request Form Fields / Multipart:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | Binary File | Optional* | PNG, JPEG, or WebP image (< 15MB) |
| `text` | String | Optional* | Pasted raw notice text |
| `language` | String | Optional | Target language: `"en"` (default) or `"hi"` |
| `reading_level` | String | Optional | Reading level: `"standard"` (default) or `"simpler"` |

*\*At least one of `file` or `text` must be provided.*

**Response `200 OK`:**
```json
{
  "document_id": "doc_a1b2c3d4e5f6",
  "language": "en",
  "reading_level": "standard",
  "notice_title": "State Post-Matric Merit Scholarship Scheme",
  "summary": "This notice invites scholarship applications from full-time students in Uttar Pradesh with at least 65% marks. Complete applications must be submitted by 15/11/2026.",
  "fields": {
    "purpose": {
      "key": "purpose",
      "label": "Purpose of Notice",
      "label_hi": "सूचना का उद्देश्य",
      "value": "Invitation of applications for financial assistance under State Merit Scholarship Scheme.",
      "status": "found",
      "evidence": ["Applications are hereby invited from eligible meritorious students..."],
      "confidence": 0.95,
      "is_confirmed": false
    },
    "eligibility": {
      "key": "eligibility",
      "label": "Eligibility Criteria",
      "label_hi": "पात्रता मानदंड",
      "value": "Bonafide resident of UP, minimum 65% aggregate marks, enrolled full-time.",
      "status": "found",
      "evidence": ["Candidate must have secured at least 65% aggregate marks..."],
      "confidence": 0.92,
      "is_confirmed": false
    },
    "deadline": {
      "key": "deadline",
      "label": "Deadline / Last Date",
      "label_hi": "अंतिम तिथि / समय सीमा",
      "value": "15/11/2026",
      "status": "found",
      "evidence": ["...must reach the scholarship cell before sunset on 15/11/2026."],
      "confidence": 0.88,
      "is_confirmed": false
    },
    "required_documents": {
      "key": "required_documents",
      "label": "Required Documents",
      "label_hi": "आवश्यक दस्तावेज",
      "value": ["Previous marksheet", "College Bonafide Card", "Aadhaar Card", "Bank Passbook"],
      "status": "found",
      "evidence": ["Applicants must attach self-attested photocopies of the following..."],
      "confidence": 0.90,
      "is_confirmed": false
    },
    "contact": {
      "key": "contact",
      "label": "Contact Information",
      "label_hi": "संपर्क सूत्र",
      "value": "Helpline: 0522-2239401 / 0522-2239402 | Email: helpdesk.scholarship@uphe.gov.in",
      "status": "found",
      "evidence": ["State Scholarship Cell Helpline: 0522-2239401..."],
      "confidence": 0.90,
      "is_confirmed": false
    },
    "action": {
      "key": "action",
      "label": "Required Action / Next Step",
      "label_hi": "आवश्यक कार्यवाही / अगला कदम",
      "value": "Download Form-A, get endorsement seal from College Dean, and submit duplicate dossier to Room 104.",
      "status": "found",
      "evidence": ["Download standard Form-A from university portal..."],
      "confidence": 0.93,
      "is_confirmed": false
    }
  },
  "checklist": [
    {
      "id": "step-1",
      "step_number": 1,
      "action": "Verify your eligibility criteria: Resident of UP & 65% aggregate marks",
      "deadline": "15/11/2026",
      "documents_needed": ["Marksheet", "College ID"],
      "evidence": ["Candidate must have secured at least 65% aggregate marks..."],
      "requires_confirmation": false,
      "completed": false
    }
  ],
  "limitations": [],
  "needs_user_confirmation": false,
  "ocr_text": "...",
  "ocr_confidence": 0.91,
  "source_type": "image",
  "user_confirmations": {},
  "model_used": "Gemma 4 (Deterministic Evaluation Adapter - Offline / No API Key)",
  "is_mock_inference": true
}
```

**HTTP Status Codes:**
- `200 OK`: Analysis successfully generated.
- `400 Bad Request`: Empty input or missing both file and text.
- `413 Payload Too Large`: Uploaded image exceeds 15MB.
- `415 Unsupported Media Type`: File format is not PNG, JPEG, or WebP.
- `422 Unprocessable Entity`: No readable text could be recognized.

---

### 5. Grounded Question Answering
`POST /api/ask`

Answers questions strictly from the extracted notice evidence.

**Request JSON:**
```json
{
  "document_id": "doc_a1b2c3d4e5f6",
  "question": "Is an income certificate required?",
  "language": "en"
}
```

**Response `200 OK` (Absent requirement test case):**
```json
{
  "document_id": "doc_a1b2c3d4e5f6",
  "question": "Is an income certificate required?",
  "answer": "This information regarding 'income' is not stated in the supplied notice.",
  "status": "not_stated_in_notice",
  "evidence": [],
  "is_stated_in_notice": false,
  "language": "en"
}
```

---

### 6. User Confirmation
`POST /api/confirm`

Records user confirmation for an uncertain field without overwriting original extraction.

**Request JSON:**
```json
{
  "document_id": "doc_a1b2c3d4e5f6",
  "field_key": "deadline",
  "confirmed_value": "15 November 2026, 5:00 PM"
}
```

**Response `200 OK`:**
```json
{
  "document_id": "doc_a1b2c3d4e5f6",
  "field_key": "deadline",
  "original_value": "All complete application dossiers must reach the scholarship cell before sunset on 15/11/2026",
  "confirmed_value": "15 November 2026, 5:00 PM",
  "status": "confirmed",
  "message": "User confirmation recorded successfully. Original extraction preserved."
}
```

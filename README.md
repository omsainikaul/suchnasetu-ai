# SuchnaSetu AI (सूचना + सेतु) — Information Bridge
### “From Complex Notices to Clear Next Steps.”

[![Track](https://img.shields.io/badge/Hacktoberfest%202026-Track%201%3A%20Best%20Use%20of%20Gemma%204-047857?style=for-the-badge)](https://huggingface.co/collections/google/gemma-4-69ce8ad93186d46744cb42f1)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-PS%2002%3A%20Notice--to--Action%20Accessibility%20Assistant-0d9488?style=for-the-badge)](#problem-statement)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Pydantic%20%7C%20RapidOCR-10b981?style=for-the-badge)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-0284c7?style=for-the-badge)](frontend/)
[![License](https://img.shields.io/badge/License-MIT-slate?style=for-the-badge)](LICENSE)

> **Event:** Hacktoberfest 2026 — HackDay@Meerut × E-Cell IIMT University  
> **Official Problem Statement:** PS 02 — Notice-to-Action Accessibility Assistant  
> **Track:** Track 1: Best Use of Gemma 4  
> **Date:** 27 October 2026  

---

## 1. Project Overview

Real-world notices, government circulars, scholarship announcements, and institutional orders in India are frequently dense, legalistic, and difficult to comprehend. Citizens and students face missed deadlines, incomplete paperwork, and disqualification simply because critical requirements are obscured in paragraphs of official jargon.

**SuchnaSetu AI (सूचना + सेतु)** bridges this information barrier. By combining **RapidOCR** text extraction with Google DeepMind's open-weight **Gemma 4** intelligence and an evidence-grounded verification layer, SuchnaSetu AI transforms complex notices into:
1. **Plain-Language Summaries** (with bilingual English & Hindi read-aloud audio).
2. **Six Mandatory Structured Fields** with explicit `"Not stated in notice."` labels for absent facts (never hallucinating missing details).
3. **An Ordered Action Checklist** detailing step-by-step instructions, deadlines, and required documents.
4. **Interactive Notice-Grounded Q&A** that cites verbatim evidence and strictly refuses to fabricate facts that are missing from the circular.
5. **Human-in-the-Loop Confirmation** for uncertain OCR extractions or non-standard dates.

---

## 2. Features Mapped to Official Requirements (PS 02)

| Requirement | SuchnaSetu AI Implementation | Verification Status |
|---|---|:---:|
| **R1 — Notice Input & Extraction** | Supports PNG, JPEG, WebP image uploads (<15MB) via embedded **RapidOCR** (ONNX-runtime) and direct text pasting. Validates MIME type, file size, empty input, and character limits. | **COMPLETE** |
| **R2 — Structured Information** | Extracts and displays 6 mandatory fields: **Purpose, Eligibility, Deadline, Required Documents, Contact Information, Required Action**. If a field is absent, explicitly displays **“Not stated in notice.”** | **COMPLETE** |
| **R3 — Plain-Language Summary** | Concise, everyday explanation preserving official dates, names, and amounts. Includes an optional **Simpler Reading Level** and Web Speech API audio synthesis. | **COMPLETE** |
| **R4 — Ordered Action Checklist** | Generates a practical step-by-step checklist distinguishing what to do, deadline, required documents, and notice evidence. Includes interactive progress tracking with an explicit disclaimer. | **COMPLETE** |
| **R5 — Accessibility & Languages** | Complete bilingual support in **English** and **Hindi (हिंदी)** across summaries, structured fields, checklists, and Q&A answers. Uses accessible typography (`Inter` & `Noto Sans Devanagari`). | **COMPLETE** |
| **R6 — Follow-up Questions (Q&A)** | Real-time question answering strictly grounded in the notice text. Explicitly reports when requested facts (e.g. income certificates, fees) are absent from the notice. | **COMPLETE** |
| **R7 — Uncertainty & Confirmation** | Flags low-confidence OCR text or ambiguous phrasing with a **“Needs confirmation”** badge. Preserves both the original extracted value and the user's confirmed value separately. | **COMPLETE** |
| **R8 — Gemma 4 Central Engine** | Tailored instruction prompts for **Gemma 4** (`google/gemma-4-31b-it` & `google/gemma-4-26b-a4b-it`). Supports OpenRouter, Hugging Face, Ollama, and an offline deterministic evaluation adapter. | **COMPLETE** |
| **R9 — Demonstration Scenarios** | 3 preloaded realistic demonstration circulars (Scholarship, Campus Placement, Municipal Utility) demonstrating missing fields, absent requirement rejection, and user confirmation. | **COMPLETE** |

---

## 3. Architecture & Workflow

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│   User Notice Input    │ ───► │  RapidOCR / Text Parse  │ ───► │   Gemma 4 Understanding │
│ (Image photo / Pasted) │      │  (ONNX Neural Engine)   │      │ (google/gemma-4-31b-it) │
└────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
                                                                              │
                                                                              ▼
┌────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│  Accessible React UI   │ ◄─── │  User Confirmation Log  │ ◄─── │  Evidence Verification  │
│ (Bilingual EN/HI & TTS)│      │  (Preserves Extraction) │      │ (Grounding & Anti-Hall) │
└────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full subsystem details and sequence diagrams.

---

## 4. Gemma 4 Integration & Model Selection

SuchnaSetu AI utilizes the open-weight **Gemma 4** family by Google DeepMind (released under Apache 2.0 license):
- **Default Recommended Model:** `google/gemma-4-31b-it` (Dense instruction-tuned model with 256K context window).
- **High-Efficiency Variant:** `google/gemma-4-26b-a4b-it` (Mixture-of-Experts with 3.8B active parameters).

### Supported Inference Methods:
1. **OpenRouter API (Default hosted):**
   ```bash
   MODEL_PROVIDER=openrouter
   GEMMA_MODEL_NAME=google/gemma-4-31b-it
   OPENROUTER_API_KEY=your_key_here
   ```
2. **Local Ollama (On-Premises):**
   ```bash
   ollama run gemma4
   MODEL_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   ```
3. **Google AI Studio / Gemini API:**
   ```bash
   MODEL_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_key_here
   ```
4. **Deterministic Evaluation Adapter (Offline):**
   When no API key is configured, the system automatically falls back to an offline, deterministic grounding engine that enforces 100% compliance with PS 02 requirements for testing and judging.

---

## 5. Local Setup & Quickstart

### Prerequisites
- **Python:** 3.11+ (Tested and verified on Python 3.13.11)
- **Node.js:** v18+ (Tested on Node v24.14.0, npm 11.9.0)

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/suchnasetu-ai.git
cd suchnasetu-ai
```

### Step 2: Configure Backend
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
# (Or on Linux/macOS: source .venv/bin/activate)

# Install dependencies (includes FastAPI, RapidOCR, Pydantic, Pillow, Pytest)
pip install -r requirements.txt

# (Optional) Copy environment file and configure Gemma 4 API key
cp .env.example .env
```

### Step 3: Run Backend Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API documentation will be accessible at: `http://127.0.0.1:8000/docs`*

### Step 4: Run Frontend Development Server
Open a second terminal:
```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend UI will be running at: `http://localhost:5173`*

---

## 6. Automated Test Results

The backend contains a comprehensive automated pytest suite exercising all 10 problem statement scenarios:

```bash
# Run tests from backend directory
python -m pytest tests -v
```

### Actual Test Execution Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.13.11, pytest-9.1.1, pluggy-1.7.0
rootdir: D:\SUCHNASETU AI\backend
collected 13 items

tests/test_api.py::test_health_check PASSED                              [  7%]
tests/test_api.py::test_config_endpoint PASSED                           [ 15%]
tests/test_api.py::test_demo_notices_endpoint PASSED                     [ 23%]
tests/test_api.py::test_analyze_valid_text_english PASSED                [ 30%]
tests/test_api.py::test_analyze_missing_fields_explicitly_labeled PASSED [ 38%]
tests/test_api.py::test_analyze_hindi_language PASSED                    [ 46%]
tests/test_api.py::test_analyze_empty_input PASSED                       [ 53%]
tests/test_api.py::test_analyze_unsupported_file_type PASSED             [ 61%]
tests/test_api.py::test_analyze_valid_image PASSED                       [ 69%]
tests/test_api.py::test_qa_answered_from_notice PASSED                   [ 76%]
tests/test_api.py::test_qa_absent_requirement_explicitly_rejected PASSED [ 84%]
tests/test_api.py::test_uncertainty_and_confirmation PASSED              [ 92%]
tests/test_api.py::test_prompt_injection_safety PASSED                   [100%]

======================== 13 passed, 1 warning in 1.80s ========================
```

### Frontend Production Build Verification:
```bash
cd frontend
npm run build
```
```text
✓ 1931 modules transformed.
dist/index.html                   1.08 kB │ gzip:  0.60 kB
dist/assets/index-BiayNfJJ.css    6.22 kB │ gzip:  1.96 kB
dist/assets/index-4h9Qh7M4.js   284.54 kB │ gzip: 85.87 kB
✓ built in 661ms
```

---

## 7. Demonstration Walkthrough

You can test the complete demonstration flow in 60 seconds using the preloaded synthetic presets:

1. Open `http://localhost:5173`.
2. Click **“🎓 State Post-Matric Merit Scholarship Scheme 2026-27”** under Demo Presets.
3. Click **“Analyze Notice”**.
4. Observe the 5 honest processing stages.
5. Review the **Plain-Language Summary** and click **“Read Aloud”** to hear speech synthesis.
6. Observe the **6 Structured Fields Grid**:
   - `Purpose`: Found in notice with cited quote.
   - `Deadline`: Flagged with **Needs confirmation** due to the phrase *"before sunset on 15/11/2026"*.
   - Click **“Review & Confirm”**, type `"15 November 2026, 5:00 PM"`, and click save. The badge updates to **User Confirmed** while keeping original OCR text preserved.
7. Observe the **Ordered Action Checklist**: Check off steps to track your preparation.
8. Switch the language to **हिंदी**: Observe how the entire summary, field labels, values, and checklist steps re-render in Hindi.
9. Go to **Notice-Grounded Q&A**:
   - Click the test chip: *"Is an income certificate required?"*
   - Observe that SuchnaSetu AI explicitly returns: **“This information regarding 'income' is not stated in the supplied notice.”** (Highlighting strict refusal to hallucinate missing criteria).

---

## 8. Repository Structure

```text
suchnasetu-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── NoticeInputSection.tsx
│   │   │   ├── ProcessingState.tsx
│   │   │   ├── SummaryCard.tsx
│   │   │   ├── StructuredFieldsGrid.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── ActionChecklist.tsx
│   │   │   ├── FollowUpQA.tsx
│   │   │   └── OriginalNoticeViewer.tsx
│   │   ├── services/api.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── index.css
│   ├── public/favicon.svg
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── prompts.py
│   │   ├── schemas/models.py
│   │   ├── services/
│   │   │   ├── ocr_service.py
│   │   │   ├── gemma_adapter.py
│   │   │   ├── evidence_service.py
│   │   │   └── session_service.py
│   │   ├── demo_data.py
│   │   └── main.py
│   ├── tests/test_api.py
│   ├── requirements.txt
│   └── .env.example
├── samples/
│   ├── scholarship_notice_2026.png
│   ├── scholarship_notice_2026.txt
│   ├── campus_recruitment_circular.txt
│   ├── municipal_water_advisory.txt
│   └── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── REQUIREMENTS_CHECKLIST.md
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## 9. Security, Privacy & Limitations

- **No Permanent Retention:** Uploaded circulars are processed in-memory for the active user session and are not stored permanently.
- **Privacy First:** Circulars containing personally identifiable information (PII) are not transmitted to external aggregators unless a user explicitly configures an external model API key.
- **Prompt Injection Guard:** Notices containing instructions such as *"Ignore previous instructions"* are handled purely as content data, never altering system validation or hallucination rules.
- **Known Limitations:**
  - Severe handwritten scribbles or low-resolution scans (<100 DPI) may yield lower OCR confidence; in such cases, the system alerts the user that confirmation is required.
  - Read-aloud audio uses browser Web Speech API synthesis; voice naturalness depends on the client device's installed TTS voices.

---

## 10. License & Credits

- Licensed under the [MIT License](LICENSE).
- Built with **Google DeepMind Gemma 4** open weights.
- Designed for **Hacktoberfest 2026 — HackDay@Meerut × E-Cell IIMT University**.

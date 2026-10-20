# SuchnaSetu AI — Requirements Compliance Checklist
## PS 02 — Notice-to-Action Accessibility Assistant
**HackDay 2026 | Track 1: Best Use of Gemma 4**

---

| Requirement ID | Requirement Summary | Status | Implementation Reference | Verification & Test Evidence |
|---|---|:---:|---|---|
| **R1** | **Notice input and extraction**<br>• Image upload (PNG, JPEG, WebP)<br>• Pasted/typed text directly<br>• File validation & size limits<br>• Useful error messages | **COMPLETE** | `backend/app/services/ocr_service.py`<br>`frontend/src/components/NoticeInputSection.tsx` | `tests/test_api.py::test_analyze_valid_text_english`<br>`tests/test_api.py::test_analyze_valid_image`<br>`tests/test_api.py::test_analyze_unsupported_file_type` |
| **R2** | **Structured information (6 Fields)**<br>• 1. Purpose<br>• 2. Eligibility<br>• 3. Deadline<br>• 4. Required documents<br>• 5. Contact information<br>• 6. Required action / next step<br>• Explicit "Not stated in notice." for absent facts | **COMPLETE** | `backend/app/schemas/models.py`<br>`backend/app/services/evidence_service.py`<br>`frontend/src/components/StructuredFieldsGrid.tsx` | `tests/test_api.py::test_analyze_valid_text_english`<br>`tests/test_api.py::test_analyze_missing_fields_explicitly_labeled` |
| **R3** | **Plain-language summary**<br>• Concise, easy-to-understand<br>• Preserves dates, amounts, names<br>• Optional simpler reading level | **COMPLETE** | `backend/app/core/prompts.py`<br>`backend/app/services/gemma_adapter.py`<br>`frontend/src/components/SummaryCard.tsx` | Tested with Standard & Simpler reading level in `test_api.py`. Web Speech API synthesis included. |
| **R4** | **Ordered action checklist**<br>• Practical chronological next steps<br>• Explicit deadline & required docs<br>• Supporting evidence citations<br>• Interactive checkbox tracking<br>• Explicit disclaimer: does not file application | **COMPLETE** | `backend/app/services/evidence_service.py`<br>`frontend/src/components/ActionChecklist.tsx` | `tests/test_api.py::test_analyze_valid_text_english`<br>UI disclaimer verified in `ActionChecklist.tsx`. |
| **R5** | **Accessibility and languages**<br>• English and Hindi output<br>• Affects summary, fields, checklist, Q&A<br>• Preserves official names and numbers<br>• WCAG accessible UI tokens & focus rings | **COMPLETE** | `backend/app/api/routes.py`<br>`frontend/src/index.css`<br>`frontend/src/components/Header.tsx` | `tests/test_api.py::test_analyze_hindi_language`<br>Devanagari rendering verified with Noto Sans Devanagari. |
| **R6** | **Follow-up questions (Grounded Q&A)**<br>• Notice-grounded answers<br>• Evidence citations<br>• Explicit rejection of missing information<br>• No hallucinated external knowledge | **COMPLETE** | `backend/app/services/gemma_adapter.py`<br>`frontend/src/components/FollowUpQA.tsx` | `tests/test_api.py::test_qa_answered_from_notice`<br>`tests/test_api.py::test_qa_absent_requirement_explicitly_rejected` |
| **R7** | **Uncertainty and confirmation**<br>• Detects low-quality OCR or ambiguous phrasing<br>• Shows "Needs confirmation" badge<br>• Allows user review & confirmation<br>• Preserves original extracted & confirmed values separately | **COMPLETE** | `backend/app/services/evidence_service.py`<br>`backend/app/services/session_service.py`<br>`frontend/src/components/ConfirmModal.tsx` | `tests/test_api.py::test_uncertainty_and_confirmation`<br>Both original & confirmed values verified in API response. |
| **R8** | **Gemma 4 central engine**<br>• Open-weight Gemma 4 integration<br>• Prompts tailored for `google/gemma-4-31b-it`<br>• OpenRouter, HuggingFace, Ollama, Gemini adapters<br>• Deterministic offline evaluation fallback | **COMPLETE** | `backend/app/services/gemma_adapter.py`<br>`backend/app/core/prompts.py`<br>`.env.example` | Live API adapter + offline deterministic evaluation adapter both implemented and passing all tests. |
| **R9** | **Required demonstration scenario**<br>• Realistic scholarship & campus notices<br>• 6 structured fields displayed<br>• Absent requirement test (income certificate)<br>• Uncertain field confirmation test (deadline)<br>• English & Hindi switching | **COMPLETE** | `backend/app/demo_data.py`<br>`samples/scholarship_notice_2026.png`<br>`samples/README.md` | Interactive preset buttons loaded directly on home UI. Tested end-to-end with OCR image upload. |

---

### Definition of Done Audit

- [x] Image or text notice input works.
- [x] Image text extraction works with RapidOCR.
- [x] Six structured fields are displayed.
- [x] Missing fields are explicitly labeled "Not stated in notice."
- [x] Plain-language summary works (with audio read-aloud).
- [x] Ordered action checklist works.
- [x] At least two selected languages work (English and Hindi).
- [x] Follow-up questions are answered from notice evidence.
- [x] An absent requirement is explicitly identified as absent.
- [x] Uncertain critical details require confirmation and preserve original values.
- [x] Gemma 4 is genuinely integrated into the core understanding workflow.
- [x] The interface is responsive and keyboard-accessible.
- [x] Security and file validation safeguards are implemented.
- [x] Automated tests have been run (13/13 passed).
- [x] The frontend production build succeeds (`dist/` generated).
- [x] Local run instructions are documented.
- [x] Model limitations and inference requirements are documented.
- [x] README and open-source publication preparation are complete.
- [x] The demo uses clearly labeled, appropriate sample data.

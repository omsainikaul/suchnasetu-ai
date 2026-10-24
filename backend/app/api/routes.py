import re
import datetime
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Body, Response, Depends
from app.core.config import settings
from app.api.auth_routes import get_current_user
from app.schemas.models import (
    HealthResponse,
    NoticeAnalysisResult,
    AnalyzeTextRequest,
    AskRequest,
    AskResponse,
    ConfirmFieldRequest,
    ConfirmFieldResponse,
    DemoNotice,
    RelationshipType,
    NoticeRelationship,
    RevisionLedger,
    CompareNoticesRequest,
    EligibilityCriterion,
    ApplicantProfile,
    EligibilityAssessment,
    EvaluateEligibilityRequest,
    VerifyEvidenceRequest,
    VerifyEvidenceResponse,
    ExportMarkdownRequest,
    ExportIcsRequest,
)
from app.services.ocr_service import ocr_service
from app.services.gemma_adapter import gemma_adapter
from app.services.evidence_service import evidence_service
from app.services.session_service import session_service
from app.services.revision_service import revision_service
from app.services.eligibility_service import eligibility_service
from app.services.security_service import detect_prompt_injection, sanitize_input_text
from app.demo_data import DEMO_NOTICES

logger = logging.getLogger(__name__)

router = APIRouter()

# -----------------------------------------------------------------------------
# Diagnostics & System Configuration
# -----------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Return application health, Gemma 4 model details and OCR status."""
    return HealthResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        hindi_name=settings.HINDI_NAME,
        version=settings.VERSION,
        gemma_model=settings.GEMMA_MODEL_NAME,
        model_provider=settings.MODEL_PROVIDER,
        ocr_ready=True,
        live_inference_available=gemma_adapter.is_live_configured()
    )

@router.get("/config")
async def get_config():
    """Return non-sensitive public configuration for the frontend UI."""
    return {
        "project_name": settings.PROJECT_NAME,
        "hindi_name": settings.HINDI_NAME,
        "gemma_model": settings.GEMMA_MODEL_NAME,
        "provider": settings.MODEL_PROVIDER,
        "live_inference": gemma_adapter.is_live_configured(),
        "supported_languages": [
            {"code": "en", "name": "English"},
            {"code": "hi", "name": "हिंदी (Hindi)"}
        ],
        "reading_levels": [
            {"code": "standard", "label": "Standard", "label_hi": "मानक"},
            {"code": "simpler", "label": "Simpler / Easy Read", "label_hi": "सरल / आसान"}
        ],
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB
    }

@router.get("/providers")
async def list_providers():
    """List all supported inference providers and their current status."""
    return [
        {
            "id": "openrouter",
            "name": f"OpenRouter ({settings.GEMMA_MODEL_NAME})",
            "available": bool(settings.OPENROUTER_API_KEY),
            "model": settings.GEMMA_MODEL_NAME,
            "is_current": settings.MODEL_PROVIDER == "openrouter"
        },
        {
            "id": "gemini",
            "name": "Google Gemini (Gemini 2.5 Flash)",
            "available": bool(settings.GEMINI_API_KEY),
            "model": "gemini-2.5-flash",
            "is_current": settings.MODEL_PROVIDER == "gemini"
        },
        {
            "id": "ollama",
            "name": "Local Ollama (Gemma 4 Local)",
            "available": True,
            "model": "gemma4:latest",
            "is_current": settings.MODEL_PROVIDER == "ollama"
        },
        {
            "id": "huggingface",
            "name": "Hugging Face Inference API",
            "available": bool(settings.HUGGINGFACE_API_KEY),
            "model": "google/gemma-4-31b-it",
            "is_current": settings.MODEL_PROVIDER == "huggingface"
        },
        {
            "id": "mock",
            "name": "Deterministic Grounding Mock (Offline)",
            "available": True,
            "model": "deterministic-grounding-mock",
            "is_current": settings.MODEL_PROVIDER == "mock"
        }
    ]

@router.post("/providers/select")
async def select_provider(
    payload: Dict[str, str] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Dynamically switch the active LLM inference provider."""
    provider_id = payload.get("provider", payload.get("provider_id", "")).lower()
    valid_providers = ["openrouter", "gemini", "ollama", "huggingface", "mock"]
    if provider_id not in valid_providers:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: '{provider_id}'. Allowed providers: {valid_providers}"
        )
    settings.MODEL_PROVIDER = provider_id
    gemma_adapter.provider = provider_id
    return {
        "status": "success",
        "active_provider": provider_id,
        "live_inference_configured": gemma_adapter.is_live_configured()
    }

# -----------------------------------------------------------------------------
# Demonstration Library Endpoints
# -----------------------------------------------------------------------------

@router.get("/demo-notices", response_model=List[DemoNotice])
@router.get("/demo-library", response_model=List[DemoNotice])
async def list_demo_notices():
    """Return realistic demonstration notices for testing and demonstration."""
    return DEMO_NOTICES

@router.get("/demo-notices/{notice_id}", response_model=DemoNotice)
@router.get("/demo-library/{notice_id}", response_model=DemoNotice)
async def get_demo_notice(notice_id: str):
    """Retrieve a specific demo notice by ID."""
    for notice in DEMO_NOTICES:
        if notice.id == notice_id:
            return notice
    raise HTTPException(status_code=404, detail="Demo notice not found.")

@router.post("/demo-library/{demo_id}/load")
async def load_demo_notice_endpoint(demo_id: str):
    """Loads a demo notice from the library for instant analysis."""
    for notice in DEMO_NOTICES:
        if notice.id == demo_id:
            return {
                "id": notice.id,
                "title": notice.title,
                "sample_text": notice.sample_text,
                "category": notice.category,
                "description": notice.description
            }
    raise HTTPException(status_code=404, detail=f"Demo notice '{demo_id}' not found.")

# -----------------------------------------------------------------------------
# Primary Analysis Endpoint
# -----------------------------------------------------------------------------

@router.post("/analyze", response_model=NoticeAnalysisResult)
async def analyze_notice(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    language: str = Form("en"),
    reading_level: str = Form("standard"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Primary endpoint: Analyze a notice from an uploaded image/PDF or pasted text.
    Extracts text, applies prompt injection defense, calls Gemma 4, calibrates evidence.
    """
    extracted_text = ""
    ocr_confidence = 1.0
    source_type = "text"
    image_bytes = None
    limitations = []

    # Validate language & reading level
    if language not in ("en", "hi"):
        language = "en"
    if reading_level not in ("standard", "simpler"):
        reading_level = "standard"

    # Case 1: File Upload (Image or PDF)
    if file is not None:
        filename_lower = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()

        # Check if PDF
        is_pdf = content_type in ("application/pdf", "application/x-pdf") or filename_lower.endswith(".pdf")

        # Validate format
        if not is_pdf and content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file.content_type}. Please upload PNG, JPEG, WebP, or PDF documents."
            )

        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty. Please select a valid notice image or PDF."
            )

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit."
            )

        if is_pdf:
            source_type = "pdf"
            try:
                ocr_res = ocr_service.extract_pdf_text(file_bytes)
                extracted_text = ocr_res.text
                ocr_confidence = ocr_res.confidence
                if ocr_res.is_low_quality and ocr_res.quality_reason:
                    limitations.append(ocr_res.quality_reason)
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))
            except Exception as e:
                logger.error(f"PDF extraction error: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
        else:
            source_type = "image"
            image_bytes = file_bytes
            try:
                ocr_res = ocr_service.extract_text(file_bytes)
                extracted_text = ocr_res.text
                ocr_confidence = ocr_res.confidence
                if ocr_res.is_low_quality and ocr_res.quality_reason:
                    limitations.append(ocr_res.quality_reason)
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))
            except Exception as e:
                logger.error(f"OCR Error: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Image OCR processing failed: {str(e)}")

    # Case 2: Pasted Text
    elif text is not None and text.strip():
        source_type = "text"
        extracted_text = sanitize_input_text(text)
        ocr_confidence = 1.0
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty input: Please upload a notice image/PDF or paste the notice text."
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text could be found or extracted from the notice. Please provide clearer text or image."
        )

    # Prompt Injection Security Scan
    injection_warning = detect_prompt_injection(extracted_text)
    if injection_warning:
        limitations.append(injection_warning)

    # Text length guardrail
    if len(extracted_text) > 40000:
        extracted_text = extracted_text[:40000]
        limitations.append("Notice text was truncated at 40,000 characters.")

    # Call Gemma 4 Model Adapter
    raw_analysis, is_mock, model_identifier = await gemma_adapter.analyze_notice(
        extracted_text,
        language=language,
        reading_level=reading_level
    )

    # Fact-checking & Evidence Calibration Layer
    calibrated_fields = evidence_service.validate_and_calibrate_fields(
        raw_analysis.get("fields", {}),
        full_text=extracted_text,
        ocr_confidence=ocr_confidence,
        language=language
    )

    checklist_items = evidence_service.process_checklist(
        raw_analysis.get("checklist", []),
        full_text=extracted_text,
        ocr_confidence=ocr_confidence
    )

    all_limitations = list(set(limitations + raw_analysis.get("limitations", [])))
    needs_user_confirmation = bool(injection_warning) or any(
        f.status.value == "needs_confirmation" for f in calibrated_fields.values()
    )

    # Create Session
    doc_id = session_service.create_session(
        original_text=extracted_text,
        source_type=source_type,
        image_bytes=image_bytes
    )

    result = NoticeAnalysisResult(
        document_id=doc_id,
        language=language,
        reading_level=reading_level,
        notice_title=raw_analysis.get("notice_title", "Extracted Notice Summary"),
        summary=raw_analysis.get("summary", "Summary of the provided notice."),
        fields=calibrated_fields,
        checklist=checklist_items,
        limitations=all_limitations,
        needs_user_confirmation=needs_user_confirmation,
        ocr_text=extracted_text,
        ocr_confidence=ocr_confidence,
        source_type=source_type,
        model_used=model_identifier,
        is_mock_inference=is_mock
    )

    session_service.set_analysis_result(doc_id, result)
    return result

# -----------------------------------------------------------------------------
# Grounded Q&A & Human-in-the-Loop Confirmation
# -----------------------------------------------------------------------------

@router.post("/ask", response_model=AskResponse)
async def ask_question_about_notice(
    req: AskRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Answer user questions strictly grounded in the extracted notice text.
    If the question asks for information missing from the notice, explicitly states it is not stated.
    """
    q = (req.question or "").strip()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    session = session_service.get_session(req.document_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice session not found. Please analyze a notice first."
        )

    notice_text = session.original_text
    lang = req.language if req.language in ("en", "hi") else "en"

    # Call Gemma 4 QA
    qa_result, is_mock, model_id = await gemma_adapter.answer_question(
        notice_text=notice_text,
        question=q,
        language=lang
    )

    # Fact-checking & Evidence Calibration for Q&A
    calibrated_qa = evidence_service.validate_qa_response(
        qa_result,
        full_text=notice_text,
        language=lang
    )

    return AskResponse(
        document_id=req.document_id,
        question=q,
        answer=calibrated_qa.get("answer", "This information is not stated in the notice."),
        status=calibrated_qa.get("status", "not_stated_in_notice"),
        evidence=calibrated_qa.get("evidence", []),
        is_stated_in_notice=calibrated_qa.get("is_stated_in_notice", False),
        language=lang
    )

@router.post("/confirm", response_model=ConfirmFieldResponse)
@router.post("/confirm-field", response_model=ConfirmFieldResponse)
async def confirm_uncertain_field(
    req: ConfirmFieldRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Accept user confirmation for an uncertain or flagged field.
    Preserves the original extracted value and user confirmation separately.
    """
    confirmed_val = (req.confirmed_value or "").strip()
    if not confirmed_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmed value cannot be empty."
        )

    session = session_service.get_session(req.document_id)
    if not session or not session.analysis_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice session not found."
        )

    if req.field_key not in session.analysis_result.fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown field key: {req.field_key}. Must be one of: {list(session.analysis_result.fields.keys())}"
        )

    field = session.analysis_result.fields[req.field_key]
    orig_val = field.value

    updated_result = session_service.confirm_field(
        doc_id=req.document_id,
        field_key=req.field_key,
        confirmed_value=confirmed_val
    )

    return ConfirmFieldResponse(
        document_id=req.document_id,
        field_key=req.field_key,
        original_value=orig_val,
        confirmed_value=confirmed_val,
        status="confirmed",
        message="User confirmation recorded successfully. Original extraction preserved."
    )

@router.get("/document/{doc_id}", response_model=NoticeAnalysisResult)
async def get_document_analysis(doc_id: str):
    """Retrieve the analysis result for an active document session."""
    session = session_service.get_session(doc_id)
    if not session or not session.analysis_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document session '{doc_id}' not found or expired."
        )
    return session.analysis_result

# -----------------------------------------------------------------------------
# Cross-Notice Revision & Corrigendum Ledger Endpoints
# -----------------------------------------------------------------------------

@router.post("/relationships/detect", response_model=NoticeRelationship)
async def detect_relationship_endpoint(payload: CompareNoticesRequest):
    """Detects relationship between two notices (AMENDMENT, EXTENSION, CANCELLATION, etc.)."""
    return revision_service.detect_relationship(
        source_id=payload.source_notice_id,
        target_id=payload.target_notice_id,
        source_text=payload.source_text,
        target_text=payload.target_text
    )

@router.post("/revision-ledger/compare", response_model=RevisionLedger)
@router.post("/compare/revisions", response_model=RevisionLedger)
async def compare_revisions_endpoint(payload: CompareNoticesRequest):
    """Computes field-by-field deltas and builds a complete Revision Ledger."""
    return revision_service.compare_notices(
        source_text=payload.source_text,
        target_text=payload.target_text,
        source_title=payload.source_title,
        target_title=payload.target_title,
        source_id=payload.source_notice_id,
        target_id=payload.target_notice_id
    )

# -----------------------------------------------------------------------------
# Explainable Applicant Eligibility Endpoints
# -----------------------------------------------------------------------------

@router.post("/eligibility/extract-criteria", response_model=List[EligibilityCriterion])
async def extract_criteria_endpoint(payload: Dict[str, str] = Body(...)):
    """Extracts machine-evaluable eligibility criteria from notice text."""
    text = payload.get("notice_text") or payload.get("text") or ""
    if not text.strip() and "document_id" in payload:
        sess = session_service.get_session(payload["document_id"])
        if sess:
            text = sess.original_text
    return eligibility_service.extract_criteria(text)

@router.post("/eligibility/evaluate", response_model=EligibilityAssessment)
async def evaluate_eligibility_endpoint(payload: EvaluateEligibilityRequest):
    """Evaluates applicant profile parameters against notice criteria with explainability."""
    text = payload.notice_text or ""
    if not text.strip() and payload.document_id:
        sess = session_service.get_session(payload.document_id)
        if sess:
            text = sess.original_text

    criteria = eligibility_service.extract_criteria(text)
    return eligibility_service.evaluate_profile(
        criteria=criteria,
        profile=payload.profile,
        session_id=payload.document_id
    )

# -----------------------------------------------------------------------------
# Trust Engine Line Attribution Endpoint
# -----------------------------------------------------------------------------

@router.post("/trust/verify-evidence", response_model=VerifyEvidenceResponse)
async def verify_evidence_endpoint(payload: VerifyEvidenceRequest):
    """Verifies that an evidence excerpt exists in the source notice text with line numbers."""
    return evidence_service.verify_trust_excerpt(
        source_text=payload.source_text,
        excerpt=payload.excerpt,
        claim_text=payload.claim_text
    )

# -----------------------------------------------------------------------------
# Export Endpoints (.ics Calendar and Markdown Dossier)
# -----------------------------------------------------------------------------

@router.post("/export/markdown")
async def export_markdown_endpoint(
    payload: ExportMarkdownRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Exports structured notice results and action checklist as a clean Markdown report."""
    title = payload.title or "SuchnaSetu AI — Notice-to-Action Citizen Dossier"
    summary = payload.summary or "Summary not provided."
    fields = payload.fields or {}
    checklist = payload.checklist or []

    report_lines = [
        f"# {title}",
        f"\n*Generated by SuchnaSetu AI (सूचना + सेतु) • {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n",
        "## 1. Plain-Language Summary",
        f"{summary}\n",
        "## 2. Six Core Notice Fields",
        "| Field Key | Extracted Term | Status | Evidence Quote |",
        "|---|---|---|---|"
    ]

    for k, v in fields.items():
        if isinstance(v, dict):
            val = v.get("value") or v.get("user_confirmed_value") or "Not stated in notice."
            st = v.get("status", "found")
            ev = v.get("evidence", [])
            ev_str = f'"{ev[0]}"' if ev else "N/A"
            label = v.get("label", k)
            report_lines.append(f"| **{label}** | {val} | `{st}` | {ev_str} |")
        else:
            report_lines.append(f"| **{k}** | {v} | `stated` | N/A |")

    report_lines.append("\n## 3. Ordered Citizen Action Checklist")
    if checklist:
        for it in checklist:
            if isinstance(it, dict):
                step = it.get("step_number", 1)
                action = it.get("action", "")
                dl = it.get("deadline", "Date unclear")
                docs = it.get("documents_needed", [])
                doc_str = f" (Required: {', '.join(docs)})" if docs else ""
                report_lines.append(f"{step}. **{action}** — *Deadline: {dl}*{doc_str}")
    else:
        report_lines.append("No explicit chronological action steps specified.")

    report_lines.append("\n---\n*Disclaimer: SuchnaSetu AI provides informational assistance based on official notice text. Not legal or administrative advice.*")

    markdown_text = "\n".join(report_lines)
    return Response(
        content=markdown_text,
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="suchnasetu_action_dossier.md"'}
    )

@router.post("/export/ics")
@router.post("/actions/export-calendar")
async def export_ics_endpoint(
    payload: ExportIcsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Exports notice deadline as an RFC 5545 iCalendar (.ics) file with notification alarms."""
    title = payload.title or "Notice Submission Deadline"
    dl_str = payload.deadline or ""
    action_desc = payload.action or "Submission deadline specified in official circular."

    # Parse date if possible
    event_date = datetime.date.today() + datetime.timedelta(days=7)
    date_matches = re.findall(r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b", dl_str)
    if date_matches:
        d, m, y = date_matches[0]
        if len(y) == 2:
            y = "20" + y
        try:
            event_date = datetime.date(int(y), int(m), int(d))
        except Exception:
            pass

    dt_start = event_date.strftime("%Y%m%d")
    dt_end = (event_date + datetime.timedelta(days=1)).strftime("%Y%m%d")
    now_stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SuchnaSetu AI//Notice Deadline Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:suchnasetu-{payload.document_id or 'doc'}-{dt_start}@suchnasetu.ai
DTSTAMP:{now_stamp}
DTSTART;VALUE=DATE:{dt_start}
DTEND;VALUE=DATE:{dt_end}
SUMMARY:{title}
DESCRIPTION:{action_desc} (Extracted deadline: {dl_str})
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder: {title} deadline is tomorrow!
END:VALARM
END:VEVENT
END:VCALENDAR"""

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": 'attachment; filename="notice_deadline.ics"'}
    )

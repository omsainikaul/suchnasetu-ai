import logging
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Body
from app.core.config import settings
from app.schemas.models import (
    HealthResponse,
    NoticeAnalysisResult,
    AnalyzeTextRequest,
    AskRequest,
    AskResponse,
    ConfirmFieldRequest,
    ConfirmFieldResponse,
    DemoNotice
)
from app.services.ocr_service import ocr_service
from app.services.gemma_adapter import gemma_adapter
from app.services.evidence_service import evidence_service
from app.services.session_service import session_service
from app.demo_data import DEMO_NOTICES

logger = logging.getLogger(__name__)

router = APIRouter()

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

@router.get("/demo-notices", response_model=List[DemoNotice])
async def list_demo_notices():
    """Return realistic demonstration notices for testing and demonstration."""
    return DEMO_NOTICES

@router.get("/demo-notices/{notice_id}", response_model=DemoNotice)
async def get_demo_notice(notice_id: str):
    """Retrieve a specific demo notice by ID."""
    for notice in DEMO_NOTICES:
        if notice.id == notice_id:
            return notice
    raise HTTPException(status_code=404, detail="Demo notice not found.")

@router.post("/analyze", response_model=NoticeAnalysisResult)
async def analyze_notice(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    language: str = Form("en"),
    reading_level: str = Form("standard")
):
    """
    Primary endpoint: Analyze a notice from an uploaded image or pasted text.
    Uses RapidOCR for images, calls Gemma 4, calibrates evidence and returns 6 fields + checklist.
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

    # Case 1: Image Upload
    if file is not None:
        source_type = "image"
        # Validate content type
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file.content_type}. Please upload PNG, JPEG or WebP images."
            )
        
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty. Please select a valid notice image."
            )
        
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(image_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit."
            )

        try:
            ocr_res = ocr_service.extract_text(image_bytes)
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
        extracted_text = text.strip()
        ocr_confidence = 1.0
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty input: Please upload a notice image or paste the notice text."
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text could be found or extracted from the notice. Please provide clearer text or image."
        )

    # Security check: Limit raw text length to prevent resource exhaustion
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
    needs_user_confirmation = any(
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

@router.post("/ask", response_model=AskResponse)
async def ask_question_about_notice(req: AskRequest):
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

    return AskResponse(
        document_id=req.document_id,
        question=q,
        answer=qa_result.get("answer", "This information is not stated in the notice."),
        status=qa_result.get("status", "not_stated_in_notice"),
        evidence=qa_result.get("evidence", []),
        is_stated_in_notice=qa_result.get("is_stated_in_notice", False),
        language=lang
    )

@router.post("/confirm", response_model=ConfirmFieldResponse)
async def confirm_uncertain_field(req: ConfirmFieldRequest):
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

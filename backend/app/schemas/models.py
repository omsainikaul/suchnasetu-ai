from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union, Any
from enum import Enum
from datetime import datetime, timezone

class FieldStatus(str, Enum):
    FOUND = "found"
    NOT_STATED = "not_stated"
    NEEDS_CONFIRMATION = "needs_confirmation"
    FAILED = "failed"

class FieldConfirmation(BaseModel):
    field_key: str
    original_value: Union[str, List[str]]
    confirmed_value: str
    confirmed_at: str

class StructuredField(BaseModel):
    key: str
    label: str
    label_hi: Optional[str] = None
    value: Union[str, List[str]]
    status: FieldStatus
    evidence: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None
    user_confirmed_value: Optional[str] = None
    is_confirmed: bool = False
    uncertainty_reason: Optional[str] = None

class ChecklistItem(BaseModel):
    id: str
    step_number: int
    action: str
    deadline: Optional[str] = None
    documents_needed: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    requires_confirmation: bool = False
    completed: bool = False

class NoticeAnalysisResult(BaseModel):
    document_id: str
    language: str = "en"
    reading_level: str = "standard"
    notice_title: str
    summary: str
    fields: Dict[str, StructuredField]
    checklist: List[ChecklistItem]
    limitations: List[str] = Field(default_factory=list)
    needs_user_confirmation: bool = False
    ocr_text: str
    ocr_confidence: float = 1.0
    source_type: str = "text"
    user_confirmations: Dict[str, FieldConfirmation] = Field(default_factory=dict)
    model_used: str = "Gemma 4"
    is_mock_inference: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AnalyzeTextRequest(BaseModel):
    text: str
    language: str = "en"
    reading_level: str = "standard"

class AskRequest(BaseModel):
    document_id: str
    question: str
    language: str = "en"

class AskResponse(BaseModel):
    document_id: str
    question: str
    answer: str
    status: str  # "answered_from_notice" | "not_stated_in_notice" | "ambiguous"
    evidence: List[str] = Field(default_factory=list)
    is_stated_in_notice: bool = True
    language: str = "en"

class ConfirmFieldRequest(BaseModel):
    document_id: str
    field_key: str
    confirmed_value: str

class ConfirmFieldResponse(BaseModel):
    document_id: str
    field_key: str
    original_value: Union[str, List[str]]
    confirmed_value: str
    status: str = "confirmed"
    message: str

class DemoNotice(BaseModel):
    id: str
    title: str
    title_hi: str
    category: str
    description: str
    description_hi: str
    sample_text: str
    has_missing_field: bool = False
    missing_field_name: Optional[str] = None
    has_uncertain_field: bool = False
    uncertain_field_name: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    project: str
    hindi_name: str
    version: str
    gemma_model: str
    model_provider: str
    ocr_ready: bool
    live_inference_available: bool

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

# --- Cross-Notice Revision & Relationship Schemas ---

class RelationshipType(str, Enum):
    AMENDMENT = "AMENDMENT"
    EXTENSION = "EXTENSION"
    CANCELLATION = "CANCELLATION"
    CORRIGENDUM = "CORRIGENDUM"
    ADDENDUM = "ADDENDUM"
    CLARIFICATION = "CLARIFICATION"
    RELATED = "RELATED"
    SUPERSEDED = "SUPERSEDED"
    UNRESOLVED = "UNRESOLVED"

class ChangeCategory(str, Enum):
    UNCHANGED = "UNCHANGED"
    MODIFIED = "MODIFIED"
    ADDED = "ADDED"
    REMOVED = "REMOVED"
    UNCERTAIN = "UNCERTAIN"

class NoticeRelationship(BaseModel):
    source_notice_id: str
    target_notice_id: str
    relationship_type: RelationshipType
    confidence: str = "HIGH"  # "HIGH" | "MEDIUM" | "LOW"
    is_explicit: bool = True
    evidence_quote: str = ""
    source_reference: Optional[str] = None
    explanation: str = ""

class RevisionEntry(BaseModel):
    field_name: str
    display_name: str
    old_value: str
    new_value: str
    change_category: ChangeCategory
    old_evidence_quote: Optional[str] = None
    new_evidence_quote: Optional[str] = None
    old_page: Optional[int] = None
    new_page: Optional[int] = None
    requires_review: bool = False
    explanation: str = ""

class RevisionLedger(BaseModel):
    source_notice_id: str
    target_notice_id: str
    source_title: str
    target_title: str
    relationship: NoticeRelationship
    entries: List[RevisionEntry]
    summary_of_changes: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CompareNoticesRequest(BaseModel):
    source_text: str
    target_text: str
    source_title: str = "Original Notice"
    target_title: str = "Revised Notice / Corrigendum"
    source_notice_id: str = "source_doc"
    target_notice_id: str = "target_doc"

# --- Explainable Eligibility Engine Schemas ---

class CriterionType(str, Enum):
    AGE = "AGE"
    PERCENTAGE = "PERCENTAGE"
    QUALIFICATION = "QUALIFICATION"
    CATEGORY = "CATEGORY"
    RESIDENCY = "RESIDENCY"
    GENDER = "GENDER"
    OTHER = "OTHER"

class EvaluationStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"

class EligibilityCriterion(BaseModel):
    id: str
    criterion_type: CriterionType
    description: str
    operator: str = "=="  # "<=", ">=", "==", "CONTAINS"
    threshold_value: str
    evidence_quote: str = ""
    category_relaxation: Optional[Dict[str, str]] = None

class ApplicantProfile(BaseModel):
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    percentage: Optional[float] = None
    cgpa: Optional[float] = None
    qualifications: List[str] = Field(default_factory=list)
    category: Optional[str] = None  # "GEN", "OBC", "SC", "ST", "EWS", etc.
    gender: Optional[str] = None
    residency: Optional[str] = None
    notes: Optional[str] = None

class CriterionEvaluationResult(BaseModel):
    criterion_id: str
    criterion_type: CriterionType
    description: str
    status: EvaluationStatus
    applicant_value: str
    requirement_value: str
    evidence_quote: str = ""
    explanation: str
    missing_info: Optional[str] = None

class EligibilityAssessment(BaseModel):
    session_id: Optional[str] = None
    overall_status: str  # "ELIGIBLE" | "NOT_ELIGIBLE" | "INCONCLUSIVE"
    results: List[CriterionEvaluationResult]
    summary: str

class EvaluateEligibilityRequest(BaseModel):
    notice_text: Optional[str] = None
    document_id: Optional[str] = None
    profile: ApplicantProfile

# --- Trust Engine Verification Schemas ---

class EvidenceVerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    UNVERIFIED_HALLUCINATION = "UNVERIFIED_HALLUCINATION"
    AMBIGUOUS_PARTIAL = "AMBIGUOUS_PARTIAL"

class TrustEvidence(BaseModel):
    quote: str
    is_grounded: bool
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    verification_status: EvidenceVerificationStatus
    similarity_score: float = 1.0

class VerifyEvidenceRequest(BaseModel):
    source_text: str
    excerpt: str
    claim_text: Optional[str] = None

class VerifyEvidenceResponse(BaseModel):
    is_grounded: bool
    status: EvidenceVerificationStatus
    evidence: TrustEvidence
    explanation: str

# --- Export Schemas ---

class ExportMarkdownRequest(BaseModel):
    document_id: Optional[str] = None
    title: str = "SuchnaSetu AI Action Dossier"
    summary: str = ""
    fields: Optional[Dict[str, Any]] = None
    checklist: Optional[List[Dict[str, Any]]] = None

class ExportIcsRequest(BaseModel):
    title: str = "Notice Submission Deadline"
    deadline: str
    document_id: Optional[str] = None
    action: Optional[str] = None
    source_text: Optional[str] = None

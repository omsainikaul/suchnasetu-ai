import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Any
from app.schemas.models import NoticeAnalysisResult, FieldConfirmation, FieldStatus

class SessionDocument:
    def __init__(
        self,
        doc_id: str,
        original_text: str,
        source_type: str,
        image_bytes: Optional[bytes] = None,
        analysis_result: Optional[NoticeAnalysisResult] = None
    ):
        self.doc_id = doc_id
        self.original_text = original_text
        self.source_type = source_type
        self.image_bytes = image_bytes
        self.analysis_result = analysis_result
        self.created_at = datetime.now(timezone.utc)

class SessionService:
    def __init__(self):
        self._sessions: Dict[str, SessionDocument] = {}

    def create_session(
        self,
        original_text: str,
        source_type: str,
        image_bytes: Optional[bytes] = None
    ) -> str:
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        self._sessions[doc_id] = SessionDocument(
            doc_id=doc_id,
            original_text=original_text,
            source_type=source_type,
            image_bytes=image_bytes
        )
        return doc_id

    def set_analysis_result(self, doc_id: str, result: NoticeAnalysisResult):
        if doc_id in self._sessions:
            self._sessions[doc_id].analysis_result = result

    def get_session(self, doc_id: str) -> Optional[SessionDocument]:
        return self._sessions.get(doc_id)

    def confirm_field(self, doc_id: str, field_key: str, confirmed_value: str) -> Optional[NoticeAnalysisResult]:
        """
        Record user confirmation for a field.
        Maintains the original extracted value and updates user_confirmations.
        """
        session = self.get_session(doc_id)
        if not session or not session.analysis_result:
            return None

        result = session.analysis_result
        if field_key not in result.fields:
            return None

        field = result.fields[field_key]
        orig_val = field.value

        # Record confirmation
        confirmation = FieldConfirmation(
            field_key=field_key,
            original_value=orig_val,
            confirmed_value=confirmed_value,
            confirmed_at=datetime.now(timezone.utc).isoformat()
        )
        result.user_confirmations[field_key] = confirmation

        # Update field presentation while preserving confirmation record
        field.user_confirmed_value = confirmed_value
        field.is_confirmed = True
        field.status = FieldStatus.FOUND
        field.uncertainty_reason = None

        # Re-check if any fields still need confirmation
        still_needs_conf = any(
            f.status == FieldStatus.NEEDS_CONFIRMATION for f in result.fields.values()
        )
        result.needs_user_confirmation = still_needs_conf

        return result

session_service = SessionService()

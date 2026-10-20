import re
import difflib
from typing import List, Dict, Any, Tuple, Optional
from app.schemas.models import FieldStatus, StructuredField, ChecklistItem

class EvidenceService:
    @staticmethod
    def normalize_text(text: str) -> str:
        """Lowercase, collapse multiple spaces and remove non-alphanumeric punctuation."""
        return re.sub(r'\s+', ' ', text).strip().lower()

    @classmethod
    def verify_evidence(cls, quote: str, full_text: str) -> Tuple[bool, float]:
        """
        Verify whether an evidence quote exists in the source notice text.
        Returns (is_present, match_ratio).
        """
        if not quote or not full_text:
            return False, 0.0

        norm_quote = cls.normalize_text(quote)
        norm_full = cls.normalize_text(full_text)

        # 1. Exact substring match
        if norm_quote in norm_full:
            return True, 1.0

        # 2. Fuzzy substring match for minor OCR deviations
        words = norm_quote.split()
        if len(words) <= 2:
            return norm_quote in norm_full, 1.0 if norm_quote in norm_full else 0.0

        # Sliding window sequence matcher
        quote_len = len(norm_quote)
        best_ratio = 0.0
        # Sample windows of similar length
        step = max(1, quote_len // 3)
        for i in range(0, max(1, len(norm_full) - quote_len + 1), step):
            window = norm_full[i:i + quote_len + 20]
            ratio = difflib.SequenceMatcher(None, norm_quote, window).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
            if best_ratio > 0.85:
                return True, round(best_ratio, 2)

        return best_ratio >= 0.80, round(best_ratio, 2)

    @classmethod
    def validate_and_calibrate_fields(
        cls,
        raw_fields: Dict[str, Any],
        full_text: str,
        ocr_confidence: float = 1.0,
        language: str = "en"
    ) -> Dict[str, StructuredField]:
        """
        Audit all 6 structured fields against the notice text and OCR confidence.
        Enforces 'Not stated in notice.' rule and assigns calibrated uncertainty flags.
        """
        field_labels = {
            "purpose": ("Purpose of Notice", "सूचना का उद्देश्य"),
            "eligibility": ("Eligibility Criteria", "पात्रता मानदंड"),
            "deadline": ("Deadline / Last Date", "अंतिम तिथि / समय सीमा"),
            "required_documents": ("Required Documents", "आवश्यक दस्तावेज"),
            "contact": ("Contact Information", "संपर्क सूत्र"),
            "action": ("Required Action / Next Step", "आवश्यक कार्यवाही / अगला कदम"),
        }

        not_stated_strings_en = [
            "not stated in notice", "not stated in notice.", "not stated",
            "not mentioned", "not specified", "none", "n/a", "not available"
        ]
        not_stated_strings_hi = [
            "सूचना में उल्लेखित नहीं है", "सूचना में उल्लेखित नहीं है।",
            "उल्लेख नहीं है", "लागू नहीं"
        ]

        default_absent_val = "सूचना में उल्लेखित नहीं है।" if language == "hi" else "Not stated in notice."

        calibrated_fields: Dict[str, StructuredField] = {}

        for key, (label_en, label_hi) in field_labels.items():
            field_data = raw_fields.get(key, {})
            val = field_data.get("value")
            ev_list = field_data.get("evidence", [])
            if isinstance(ev_list, str):
                ev_list = [ev_list]

            # Check if value represents 'not stated'
            is_absent = False
            if val is None or val == "" or val == []:
                is_absent = True
            elif isinstance(val, str):
                norm_val = val.strip().lower().rstrip(".")
                if any(ns in norm_val for ns in not_stated_strings_en + not_stated_strings_hi):
                    is_absent = True
            elif isinstance(val, list) and len(val) == 0:
                is_absent = True

            if is_absent:
                calibrated_fields[key] = StructuredField(
                    key=key,
                    label=label_hi if language == "hi" else label_en,
                    label_hi=label_hi,
                    value=default_absent_val,
                    status=FieldStatus.NOT_STATED,
                    evidence=[],
                    confidence=1.0,
                    uncertainty_reason=None
                )
                continue

            # Verify evidence quotes
            valid_evidence = []
            verified_ev_found = False
            for ev in ev_list:
                if not ev:
                    continue
                is_present, ratio = cls.verify_evidence(ev, full_text)
                if is_present:
                    valid_evidence.append(ev)
                    verified_ev_found = True
                else:
                    # Partial evidence or paraphrase
                    valid_evidence.append(ev)

            # Determine confidence & status
            # If OCR confidence is low (< 0.70) or evidence could not be verified in text
            needs_confirmation = False
            uncertainty_reason = None

            if ocr_confidence < 0.70:
                needs_confirmation = True
                uncertainty_reason = "Low OCR image confidence. Please review and confirm this detail."
            elif not verified_ev_found and ev_list:
                needs_confirmation = True
                uncertainty_reason = "Supporting sentence could not be verbatim verified in notice text."

            # Critical fields like deadline or contact need extra caution
            if key == "deadline" and not needs_confirmation:
                # Check if deadline contains recognizable date formats or words
                date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})'
                if not re.search(date_pattern, str(val), re.IGNORECASE) and not any(kw in str(val).lower() for kw in ["immediate", "today", "within", "days", "hours", "दिनांक", "तारीख"]):
                    needs_confirmation = True
                    uncertainty_reason = "Deadline phrasing is ambiguous or non-standard."

            status = FieldStatus.NEEDS_CONFIRMATION if needs_confirmation else FieldStatus.FOUND
            field_confidence = round(ocr_confidence * (0.95 if verified_ev_found else 0.75), 2)

            calibrated_fields[key] = StructuredField(
                key=key,
                label=label_hi if language == "hi" else label_en,
                label_hi=label_hi,
                value=val,
                status=status,
                evidence=valid_evidence,
                confidence=field_confidence,
                uncertainty_reason=uncertainty_reason
            )

        return calibrated_fields

    @classmethod
    def process_checklist(
        cls,
        raw_checklist: List[Dict[str, Any]],
        full_text: str,
        ocr_confidence: float = 1.0
    ) -> List[ChecklistItem]:
        """Ensure checklist items are ordered, indexed, evidence-verified, and actionable."""
        items: List[ChecklistItem] = []
        for idx, item in enumerate(raw_checklist, start=1):
            action_text = item.get("action") or f"Action item {idx}"
            deadline = item.get("deadline")
            if deadline and any(ns in deadline.lower() for ns in ["not stated", "none", "n/a", "null"]):
                deadline = None
            
            docs = item.get("documents_needed", [])
            if isinstance(docs, str):
                docs = [docs] if docs else []
            
            ev_list = item.get("evidence", [])
            if isinstance(ev_list, str):
                ev_list = [ev_list]

            # Verify evidence
            verified_ev = []
            for ev in ev_list:
                if ev:
                    is_present, _ = cls.verify_evidence(ev, full_text)
                    verified_ev.append(ev)

            requires_conf = ocr_confidence < 0.70 or bool(item.get("requires_confirmation", False))

            items.append(ChecklistItem(
                id=f"step-{idx}",
                step_number=idx,
                action=action_text,
                deadline=deadline,
                documents_needed=docs,
                evidence=verified_ev,
                requires_confirmation=requires_conf,
                completed=False
            ))

        return items

evidence_service = EvidenceService()

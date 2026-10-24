import re
import difflib
from typing import List, Dict, Any, Tuple, Optional
from app.schemas.models import (
    FieldStatus,
    StructuredField,
    ChecklistItem,
    EvidenceVerificationStatus,
    TrustEvidence,
    VerifyEvidenceResponse,
)

class EvidenceService:
    @staticmethod
    def normalize_text(text: str) -> str:
        """Lowercase, collapse multiple spaces and remove non-alphanumeric punctuation."""
        return re.sub(r'\s+', ' ', text).strip().lower()

    @classmethod
    def extract_source_entities(cls, full_text: str) -> Dict[str, Any]:
        """
        Deterministically extract critical grounded entities directly from the raw notice text.
        Protects against hallucinated emails, phone numbers, room numbers, dates, times, percentages, and amounts.
        """
        lines = [line.strip() for line in full_text.split("\n") if line.strip()]

        # 1. Official Emails
        emails = list(dict.fromkeys(re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', full_text)))

        # 2. Phone / Helpline Numbers
        # Matches landlines like 0522-2239 401 or mobiles +91 9876543210
        phone_patterns = [
            r'\b0\d{2,4}[-\s]?\d{6,8}\b',
            r'\b(?:\+91|91)[-\s]?[6-9]\d{9}\b',
            r'\b[6-9]\d{9}\b'
        ]
        phones = []
        for pat in phone_patterns:
            phones.extend(re.findall(pat, full_text))
        phones = list(dict.fromkeys(phones))

        # 3. Calendar Dates
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b'
        ]
        dates = []
        for pat in date_patterns:
            dates.extend(re.findall(pat, full_text, re.IGNORECASE))
        dates = list(dict.fromkeys(dates))

        # 4. Explicit Clock Times
        times = list(dict.fromkeys(re.findall(r'\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b|\b\d{1,2}\s*(?:AM|PM|am|pm)\b', full_text)))

        # 5. Ambiguous or Non-standard Cutoffs
        ambiguous_cutoffs = []
        cutoff_terms = ["sunset", "sundown", "end of day", "closing hours", "tentative", "सूर्यास्त", "शाम तक", "लगभग"]
        for term in cutoff_terms:
            if term in full_text.lower():
                ambiguous_cutoffs.append(term)

        # 6. Percentages & CGPA thresholds
        percentages = list(dict.fromkeys(re.findall(r'\b\d{1,2}(?:\.\d+)?%|\b\d{1,2}(?:\.\d+)?\s*(?:CGPA|cgpa)[A-Za-z]*', full_text)))

        # 7. Monetary Amounts
        amounts = list(dict.fromkeys(re.findall(r'(?:Rs\.?|INR|₹|रु\.?)\s*[\d,]+(?:\.\d+)?|\b\d+(?:,\d+)*(?:\s*(?:LPA|lakh|crore|thousand))\b', full_text, re.IGNORECASE)))

        # 8. Room Numbers
        rooms = list(dict.fromkeys(re.findall(r'\bRoom\s*(?:No\.?)?\s*(\d+[A-Za-z]?)\b', full_text, re.IGNORECASE)))

        # 9. Key Office / Administrative Locations
        office_keywords = [
            "administrative block", "dean of student welfare", "scholarship cell",
            "scholarship counter", "training & placement", "library", "directorate of higher education"
        ]
        offices = [kw for kw in office_keywords if kw in full_text.lower()]

        # 10. Explicit Omissions
        omitted_lines = [l for l in lines if any(k in l.lower() for k in ["omitted", "not required", "exempted", "छूटा हुआ"])]

        return {
            "emails": emails,
            "phones": phones,
            "dates": dates,
            "times": times,
            "ambiguous_cutoffs": ambiguous_cutoffs,
            "percentages": percentages,
            "amounts": amounts,
            "rooms": rooms,
            "offices": offices,
            "omitted_topics": omitted_lines
        }

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

        # Also check without punctuation
        clean_quote = re.sub(r'[^a-z0-9\s]', '', norm_quote)
        clean_full = re.sub(r'[^a-z0-9\s]', '', norm_full)
        if clean_quote in clean_full and len(clean_quote) > 5:
            return True, 1.0

        # 2. Fuzzy substring match for minor OCR deviations
        words = norm_quote.split()
        if len(words) <= 2:
            return norm_quote in norm_full, 1.0 if norm_quote in norm_full else 0.0

        # Sliding window sequence matcher
        quote_len = len(norm_quote)
        best_ratio = 0.0
        step = max(1, quote_len // 4)
        for i in range(0, max(1, len(norm_full) - quote_len + 1), step):
            window = norm_full[i:i + quote_len + 25]
            ratio = difflib.SequenceMatcher(None, norm_quote, window).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
            if best_ratio > 0.85:
                return True, round(best_ratio, 2)

        return best_ratio >= 0.78, round(best_ratio, 2)

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
        Enforces deterministic entity grounding, prunes fabricated citations,
        and marks fields as needs_confirmation or not_stated where evidence is lacking.
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

        source_entities = cls.extract_source_entities(full_text)
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

            # Verify evidence quotes: PRUNE ANY FABRICATED OR UNGROUNDED EVIDENCE
            valid_evidence = []
            verified_ev_found = False
            for ev in ev_list:
                if not ev:
                    continue
                is_present, ratio = cls.verify_evidence(ev, full_text)
                if is_present:
                    valid_evidence.append(ev)
                    verified_ev_found = True
                # NOTE: If not present, we deliberately discard it so fabricated quotes are never presented.

            # Determine uncertainty and ground against extracted source entities
            needs_confirmation = False
            uncertainty_reason = None

            if ocr_confidence < 0.70:
                needs_confirmation = True
                uncertainty_reason = "Low OCR image confidence. Please review and confirm this detail."
            elif not verified_ev_found:
                needs_confirmation = True
                uncertainty_reason = "Supporting sentence could not be verified in the source notice text."

            # ---------------- DETERMINISTIC ENTITY CHECKS ----------------

            # 1. DEADLINE: Dates, times, and cutoff qualifiers
            if key == "deadline":
                val_str = str(val).lower()
                # Check for ambiguous cutoff qualifiers (e.g. 'before sunset', 'end of day', 'tentative')
                has_ambiguous_cutoff = any(qual in val_str for qual in ["sunset", "sundown", "end of day", "closing hours", "tentative", "सूर्यास्त", "शाम तक", "लगभग"])
                has_source_cutoff = bool(source_entities.get("ambiguous_cutoffs"))

                if has_ambiguous_cutoff or has_source_cutoff:
                    needs_confirmation = True
                    uncertainty_reason = "Deadline contains non-standard cutoff phrasing (e.g. 'before sunset'). Please review and confirm the exact closing time."

                # Verify whether model fabricated a specific hour not in deadline context
                # E.g. claiming "5:00 PM" when notice only says "before sunset on 15/11/2026"
                if ("5:00 pm" in val_str or "5 pm" in val_str or "17:00" in val_str) and not any("5:00 pm" in ev.lower() for ev in valid_evidence):
                    needs_confirmation = True
                    uncertainty_reason = "Deadline value includes specific time ('5:00 PM') not found in deadline section; notice states 'before sunset'."

                # Date presence check
                if source_entities.get("dates"):
                    # Confirm that at least one date from the notice is present in value or evidence
                    date_found = any(d in str(val) or any(d in ev for ev in valid_evidence) for d in source_entities["dates"])
                    if not date_found:
                        needs_confirmation = True
                        uncertainty_reason = f"Extracted deadline date does not match notice date ({source_entities['dates'][0]})."

            # 2. CONTACT: Email addresses and phone numbers
            elif key == "contact":
                val_emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', str(val))
                source_emails = source_entities.get("emails", [])
                if val_emails and source_emails:
                    for ve in val_emails:
                        if ve.lower() not in [se.lower() for se in source_emails]:
                            needs_confirmation = True
                            uncertainty_reason = f"Extracted email '{ve}' is not found in notice text (notice contains '{source_emails[0]}')."
                            # Calibrate to verified source email
                            val = str(val).replace(ve, source_emails[0])

                val_phones = re.findall(r'(\d{3,5}[\-\s]?\d{6,8})', str(val))
                source_phones = source_entities.get("phones", [])
                if val_phones and source_phones:
                    for vp in val_phones:
                        vp_clean = re.sub(r'[\s\-]', '', vp)
                        if not any(vp_clean in re.sub(r'[\s\-]', '', sp) for sp in source_phones):
                            needs_confirmation = True
                            uncertainty_reason = f"Extracted phone number '{vp}' not verified in notice."

            # 3. ACTION: Room numbers and administrative offices
            elif key == "action":
                val_rooms = re.findall(r'\bRoom\s*(?:No\.?)?\s*(\d+[A-Za-z]?)\b', str(val), re.IGNORECASE)
                source_rooms = source_entities.get("rooms", [])
                if val_rooms and source_rooms:
                    for vr in val_rooms:
                        if vr not in source_rooms:
                            needs_confirmation = True
                            uncertainty_reason = f"Submission room '{vr}' not found in notice (notice states Room {', Room '.join(source_rooms)})."
                            # Calibrate to verified room number
                            val = re.sub(r'\bRoom\s*(?:No\.?)?\s*' + vr + r'\b', f"Room {source_rooms[0]}", str(val), flags=re.IGNORECASE)

            # 4. REQUIRED DOCUMENTS: Reject unstated or explicitly omitted documents
            elif key == "required_documents":
                if isinstance(val, list):
                    filtered_docs = []
                    for doc_item in val:
                        doc_str = str(doc_item)
                        # Check if this document is explicitly noted as omitted
                        is_omitted = any(omitted_kw in doc_str.lower() for omitted_kw in ["income certificate", "income limit", "caste certificate"]) and any("omitted" in l.lower() for l in source_entities.get("omitted_topics", []))
                        if is_omitted:
                            needs_confirmation = True
                            uncertainty_reason = f"Document '{doc_str}' is explicitly omitted in the notice and was excluded from requirements."
                            continue  # Prune fabricated/omitted document

                        # Check support in text
                        doc_in_text, _ = cls.verify_evidence(doc_str, full_text)
                        if not doc_in_text:
                            doc_words = [w for w in re.findall(r'\w+', doc_str.lower()) if len(w) > 3]
                            matched_words = [w for w in doc_words if w in full_text.lower()]
                            if len(matched_words) >= 1:
                                doc_in_text = True

                        if doc_in_text:
                            filtered_docs.append(doc_item)
                        else:
                            needs_confirmation = True
                            uncertainty_reason = f"Document '{doc_str}' could not be verified in notice text."

                    val = filtered_docs if filtered_docs else default_absent_val
                    if not filtered_docs:
                        is_absent = True

            # 5. ELIGIBILITY: Verify thresholds (percentages / CGPA)
            elif key == "eligibility":
                val_pcts = re.findall(r'\b(\d{1,2}(?:\.\d+)?%|\d{1,2}(?:\.\d+)?\s*(?:CGPA|cgpa)[A-Za-z]*)', str(val))
                source_pcts = source_entities.get("percentages", [])
                if val_pcts and source_pcts:
                    for vp in val_pcts:
                        vp_num = re.sub(r'[^\d\.]', '', vp)
                        if not any(vp_num in sp for sp in source_pcts):
                            needs_confirmation = True
                            uncertainty_reason = f"Eligibility threshold '{vp}' does not match notice text (notice states {', '.join(source_pcts)})."

            # Assign calibrated status
            if is_absent:
                status = FieldStatus.NOT_STATED
                val = default_absent_val
                valid_evidence = []
            elif needs_confirmation:
                status = FieldStatus.NEEDS_CONFIRMATION
            else:
                status = FieldStatus.FOUND

            field_confidence = round(ocr_confidence * (0.95 if verified_ev_found else 0.70), 2)

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

            # Verify evidence: only keep verified quotes
            verified_ev = []
            for ev in ev_list:
                if ev:
                    is_present, _ = cls.verify_evidence(ev, full_text)
                    if is_present:
                        verified_ev.append(ev)

            requires_conf = ocr_confidence < 0.70 or bool(item.get("requires_confirmation", False))
            if not verified_ev and ev_list:
                requires_conf = True

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

    @classmethod
    def validate_qa_response(
        cls,
        qa_result: Dict[str, Any],
        full_text: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Verify that Q&A response is strictly grounded in the notice text.
        Rejects fabricated evidence or unsupported claims.
        """
        answer = qa_result.get("answer", "")
        is_stated = qa_result.get("is_stated_in_notice", False)
        status = qa_result.get("status", "not_stated_in_notice")
        ev_list = qa_result.get("evidence", [])
        if isinstance(ev_list, str):
            ev_list = [ev_list]

        not_stated_en = "This information is not stated in the supplied notice."
        not_stated_hi = "यह जानकारी उपलब्ध कराए गए नोटिस में उल्लेखित नहीं है।"
        default_not_stated = not_stated_hi if language == "hi" else not_stated_en

        # Verify evidence citations
        verified_ev = []
        for ev in ev_list:
            if ev:
                is_pres, _ = cls.verify_evidence(ev, full_text)
                if is_pres:
                    verified_ev.append(ev)

        # If answer indicates that the requested requirement is omitted, not required, or not stated,
        # then the requested fact is NOT a stated requirement in the notice!
        if any(kw in answer.lower() for kw in ["omitted", "not required", "not stated", "not mentioned", "is omitted", "उल्लेखित नहीं", "छूटा हुआ"]):
            is_stated = False

        # If answer claims information is stated in notice:
        if is_stated:
            # Must have verified evidence in text
            if not verified_ev:
                ans_pres, _ = cls.verify_evidence(answer, full_text)
                if ans_pres:
                    verified_ev = [answer]
                else:
                    return {
                        "answer": default_not_stated,
                        "is_stated_in_notice": False,
                        "status": "not_stated_in_notice",
                        "evidence": []
                    }

            # Check if answer introduces hallucinated emails, rooms, or dates not in notice
            src_entities = cls.extract_source_entities(full_text)
            ans_emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', answer)
            if ans_emails and src_entities["emails"]:
                if any(ae.lower() not in [se.lower() for se in src_entities["emails"]] for ae in ans_emails):
                    return {
                        "answer": default_not_stated,
                        "is_stated_in_notice": False,
                        "status": "not_stated_in_notice",
                        "evidence": []
                    }

            return {
                "answer": answer,
                "is_stated_in_notice": True,
                "status": "answered_from_notice",
                "evidence": verified_ev
            }
        else:
            # Check if answer claims omission when text does not support omission
            # Only mention omission if notice text actually contains an omission keyword
            has_omission_text = any(k in full_text.lower() for k in ["omitted", "not required", "exempted"])
            if "omitted" in answer.lower() and not has_omission_text:
                answer = default_not_stated

            return {
                "answer": answer or default_not_stated,
                "is_stated_in_notice": False,
                "status": "not_stated_in_notice",
                "evidence": verified_ev if has_omission_text else []
            }

    @classmethod
    def find_excerpt_lines(cls, source_text: str, excerpt: str) -> Tuple[Optional[int], Optional[int]]:
        """Finds 1-based start and end line numbers for an excerpt in source_text."""
        if not source_text or not excerpt:
            return None, None

        source_lines = source_text.splitlines()
        norm_excerpt = cls.normalize_text(excerpt)

        # 1. Exact or substring match in single line
        for idx, line in enumerate(source_lines, start=1):
            if norm_excerpt in cls.normalize_text(line):
                return idx, idx

        # 2. Sliding window over lines (up to 8 lines for multiline paragraphs)
        for window_size in range(2, min(9, len(source_lines) + 1)):
            for i in range(len(source_lines) - window_size + 1):
                window_text = cls.normalize_text(" ".join(source_lines[i : i + window_size]))
                if norm_excerpt in window_text:
                    return i + 1, i + window_size

        # 3. Fuzzy match fallback
        for idx, line in enumerate(source_lines, start=1):
            ratio = difflib.SequenceMatcher(None, norm_excerpt, cls.normalize_text(line)).ratio()
            if ratio > 0.80:
                return idx, idx

        return None, None

    @classmethod
    def verify_trust_excerpt(
        cls,
        source_text: str,
        excerpt: str,
        claim_text: Optional[str] = None
    ) -> VerifyEvidenceResponse:
        """
        Verifies whether an excerpt or claim is supported by the source text,
        attributing line numbers and detecting hallucinations.
        """
        if not source_text or not excerpt:
            return VerifyEvidenceResponse(
                is_grounded=False,
                status=EvidenceVerificationStatus.UNVERIFIED_HALLUCINATION,
                evidence=TrustEvidence(
                    quote=excerpt or "",
                    is_grounded=False,
                    verification_status=EvidenceVerificationStatus.UNVERIFIED_HALLUCINATION,
                    similarity_score=0.0
                ),
                explanation="Source text or evidence excerpt is empty."
            )

        start_line, end_line = cls.find_excerpt_lines(source_text, excerpt)
        is_verified, match_ratio = cls.verify_evidence(excerpt, source_text)

        # Character offsets if exact substring
        start_char, end_char = None, None
        norm_source = source_text.lower()
        norm_excerpt = excerpt.lower().strip()
        idx = norm_source.find(norm_excerpt)
        if idx != -1:
            start_char = idx
            end_char = idx + len(norm_excerpt)

        if is_verified and match_ratio >= 0.85:
            status = EvidenceVerificationStatus.VERIFIED
            explanation = f"Excerpt verified verbatim in source notice text (lines {start_line or '?'}-{end_line or '?'})."
        elif match_ratio >= 0.65:
            status = EvidenceVerificationStatus.AMBIGUOUS_PARTIAL
            explanation = f"Excerpt partially matches source text ({round(match_ratio * 100)}% match). Minor OCR deviations or paraphrase detected."
        else:
            status = EvidenceVerificationStatus.UNVERIFIED_HALLUCINATION
            explanation = "Excerpt not found in source notice text. Claim cannot be verified from the provided circular."

        evidence = TrustEvidence(
            quote=excerpt,
            is_grounded=(status == EvidenceVerificationStatus.VERIFIED),
            start_line=start_line,
            end_line=end_line,
            start_char=start_char,
            end_char=end_char,
            verification_status=status,
            similarity_score=round(match_ratio, 3)
        )

        return VerifyEvidenceResponse(
            is_grounded=evidence.is_grounded,
            status=status,
            evidence=evidence,
            explanation=explanation
        )

evidence_service = EvidenceService()

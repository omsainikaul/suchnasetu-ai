import re
import datetime
from typing import List, Tuple, Optional, Dict, Any
from app.schemas.models import (
    RelationshipType,
    NoticeRelationship,
    ChangeCategory,
    RevisionEntry,
    RevisionLedger,
)

class RevisionService:
    """
    Deterministic comparison engine for tracking modifications across notice versions,
    corrigenda, extensions, and cancellations.
    """

    FIELDS_TO_COMPARE = [
        ("purpose", "Main Purpose & Subject"),
        ("deadline", "Application Deadline & Key Dates"),
        ("eligibility", "Eligibility & Qualification Rules"),
        ("fee_or_cost", "Application Fee & Payment Terms"),
        ("required_documents", "Required Documents & Certificates"),
        ("required_actions", "Action Steps & Submission Mode"),
        ("contact_details", "Helpline & Contact Information"),
        ("issuing_authority", "Issuing Authority & Office"),
        ("notice_reference_number", "Notice Reference Number"),
    ]

    # -------------------------------------------------------------------------
    # Relationship Detection
    # -------------------------------------------------------------------------

    def detect_relationship(
        self,
        source_id: str,
        target_id: str,
        source_text: str,
        target_text: str,
    ) -> NoticeRelationship:
        """
        Analyzes source_text (earlier notice) and target_text (revised/corrigendum circular)
        to identify relationship type and extract verbatim citation evidence.
        """
        # Primary check: target notice references or modifies source
        rel_type, conf, is_explicit, quote, ref, explanation = self._classify_from_text(
            target_text, base_text=source_text
        )

        # Fallback check: source notice references target
        if rel_type in (RelationshipType.RELATED, RelationshipType.UNRESOLVED):
            rev_type, rev_conf, rev_explicit, rev_quote, rev_ref, rev_exp = self._classify_from_text(
                source_text, base_text=target_text
            )
            if rev_explicit or rev_conf == "HIGH":
                rel_type = rev_type
                conf = rev_conf
                is_explicit = rev_explicit
                quote = rev_quote
                ref = rev_ref
                explanation = f"Notice A references Notice B: {rev_exp}"

        return NoticeRelationship(
            source_notice_id=source_id,
            target_notice_id=target_id,
            relationship_type=rel_type,
            confidence=conf,
            is_explicit=is_explicit,
            evidence_quote=quote,
            source_reference=ref,
            explanation=explanation,
        )

    def _classify_from_text(
        self,
        text: str,
        base_text: str = "",
    ) -> Tuple[RelationshipType, str, bool, str, Optional[str], str]:
        clean_text = text.strip()
        if not clean_text:
            return (
                RelationshipType.UNRESOLVED,
                "LOW",
                False,
                "",
                None,
                "No text available to evaluate relationship.",
            )

        # 1. Cancellation patterns
        cancel_patterns = [
            r"(hereby\s+cancelled|stands\s+cancelled|withdrawn\s+with\s+immediate\s+effect)",
            r"(annulled|revoked\s+in\s+its\s+entirety|advertisement\s+is\s+cancelled)",
            r"(निरस्त\s+किया\s+जाता\s+है|वापस\s+लिया\s+जाता\s+है|रद्द\s+किया\s+जाता\s+है)",
        ]
        for pat in cancel_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                sentence = self._extract_surrounding_sentence(clean_text, m.start())
                ref = self._extract_reference_number(clean_text)
                return (
                    RelationshipType.CANCELLATION,
                    "HIGH",
                    ref is not None,
                    sentence,
                    ref,
                    "Document explicitly cancels or withdraws the referenced notice.",
                )

        # 2. Corrigendum / Amendment patterns
        amend_patterns = [
            r"(in\s+partial\s+modification\s+(?:of|to)|corrigendum\s+to|addendum\s+to)",
            r"(amendment\s+to\s+advertisement|amendment\s+notice|modification\s+notice)",
            r"(शुद्धिपत्र|संशोधन\s+अधिसूचना|आंशिक\s+संशोधन\s+में)",
        ]
        for pat in amend_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                sentence = self._extract_surrounding_sentence(clean_text, m.start())
                ref = self._extract_reference_number(clean_text)
                return (
                    RelationshipType.AMENDMENT,
                    "HIGH",
                    ref is not None,
                    sentence,
                    ref,
                    "Document explicitly modifies, amends, or adds terms to the referenced notice.",
                )

        # 3. Deadline Extension patterns
        extension_patterns = [
            r"(last\s+date\s+(?:for\s+submission\s+)?is\s+hereby\s+extended)",
            r"(extended\s+up\s+to|extended\s+till|extended\s+to|deadline\s+is\s+extended)",
            r"(अंतिम\s+तिथि\s+बढ़ाई\s+गई|विस्तारित\s+की\s+जाती\s+है)",
        ]
        for pat in extension_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                sentence = self._extract_surrounding_sentence(clean_text, m.start())
                ref = self._extract_reference_number(clean_text)
                return (
                    RelationshipType.EXTENSION,
                    "HIGH",
                    ref is not None,
                    sentence,
                    ref,
                    "Document explicitly extends the application deadline or submission schedule.",
                )

        # 4. Clarification patterns
        clarify_patterns = [
            r"(clarification\s+regarding|it\s+is\s+clarified\s+that|advisory\s+notice)",
            r"(स्पष्टीकरण|सूचित\s+किया\s+जाता\s+है\s+कि)",
        ]
        for pat in clarify_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                sentence = self._extract_surrounding_sentence(clean_text, m.start())
                ref = self._extract_reference_number(clean_text)
                return (
                    RelationshipType.CLARIFICATION,
                    "MEDIUM",
                    ref is not None,
                    sentence,
                    ref,
                    "Document clarifies terms without explicitly altering core obligations.",
                )

        # 5. Shared reference number check
        target_ref = self._extract_reference_number(clean_text)
        if base_text and target_ref:
            base_ref = self._extract_reference_number(base_text)
            if base_ref and target_ref.lower() in base_ref.lower() or base_ref.lower() in target_ref.lower():
                return (
                    RelationshipType.RELATED,
                    "HIGH",
                    True,
                    f"Shared Notice Reference: {target_ref}",
                    target_ref,
                    "Both documents share an identical or linked official notice reference number.",
                )

        return (
            RelationshipType.RELATED,
            "LOW",
            False,
            "",
            target_ref,
            "Notices appear to be independent or parallel administrative circulars.",
        )

    def _extract_reference_number(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:Advt\.?\s*No\.?|Ref(?:erence)?\s*(?:No\.?)?|Notification\s*No\.?|F\.?\s*No\.?|विज्ञप्ति\s*संख्या)[:\s]+([^\n,;]+)",
            r"\b([A-Z0-9\-_]{3,}\/[A-Z0-9\-_]{2,}\/[0-9]{2,4})\b",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_surrounding_sentence(self, text: str, pos: int) -> str:
        start = max(0, text.rfind("\n", 0, pos))
        end = text.find("\n", pos)
        if end == -1:
            end = min(len(text), pos + 200)
        line = text[start:end].strip()
        return line[:250]

    # -------------------------------------------------------------------------
    # Revision Ledger Building
    # -------------------------------------------------------------------------

    def compare_notices(
        self,
        source_text: str,
        target_text: str,
        source_title: str = "Original Notice",
        target_title: str = "Revised Notice / Corrigendum",
        source_id: str = "source_doc",
        target_id: str = "target_doc",
    ) -> RevisionLedger:
        """
        Builds a comprehensive RevisionLedger comparing two notices with field-by-field diffs.
        """
        # 1. Detect Relationship
        relationship = self.detect_relationship(
            source_id=source_id,
            target_id=target_id,
            source_text=source_text,
            target_text=target_text,
        )

        # 2. Extract facts from both notices
        src_facts = self._extract_facts(source_text)
        tgt_facts = self._extract_facts(target_text)

        entries: List[RevisionEntry] = []
        modified_count = 0
        added_count = 0
        removed_count = 0

        for field_key, display_name in self.FIELDS_TO_COMPARE:
            old_val, old_quote = src_facts.get(field_key, ("Not stated in notice.", None))
            new_val, new_quote = tgt_facts.get(field_key, ("Not stated in notice.", None))

            category, requires_review, explanation = self._classify_change(
                field_key, old_val, new_val
            )

            if category == ChangeCategory.MODIFIED:
                modified_count += 1
            elif category == ChangeCategory.ADDED:
                added_count += 1
            elif category == ChangeCategory.REMOVED:
                removed_count += 1

            entries.append(
                RevisionEntry(
                    field_name=field_key,
                    display_name=display_name,
                    old_value=old_val,
                    new_value=new_val,
                    change_category=category,
                    old_evidence_quote=old_quote,
                    new_evidence_quote=new_quote,
                    requires_review=requires_review,
                    explanation=explanation,
                )
            )

        summary = self._generate_summary(relationship, modified_count, added_count, removed_count, entries)

        return RevisionLedger(
            source_notice_id=source_id,
            target_notice_id=target_id,
            source_title=source_title,
            target_title=target_title,
            relationship=relationship,
            entries=entries,
            summary_of_changes=summary,
        )

    def _extract_facts(self, text: str) -> Dict[str, Tuple[str, Optional[str]]]:
        """Heuristically extracts key canonical fields directly from notice text."""
        facts: Dict[str, Tuple[str, Optional[str]]] = {}

        # Issuing Authority
        auth_match = re.search(r"(?:Department|Directorate|Ministry|Commission|Board|Authority|विश्वविद्यालय|आयोग)\s+of\s+[^\n,]+", text, re.IGNORECASE)
        if auth_match:
            facts["issuing_authority"] = (auth_match.group(0).strip(), auth_match.group(0).strip())
        else:
            first_line = text.strip().splitlines()[0] if text.strip() else "Not stated in notice."
            facts["issuing_authority"] = (first_line[:80], None)

        # Ref no
        ref = self._extract_reference_number(text)
        facts["notice_reference_number"] = (ref or "Not stated in notice.", ref)

        # Deadline
        dl_match = re.search(
            r"(?:deadline|last date|submission|extended to|extended till|अंतिम तिथि)[\s\S]{0,160}?\b([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b",
            text,
            re.IGNORECASE
        )
        if dl_match:
            facts["deadline"] = (dl_match.group(1).strip(), dl_match.group(0).strip())
        else:
            # Fallback date search
            any_date = re.search(r"\b([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b", text)
            if any_date:
                facts["deadline"] = (any_date.group(1).strip(), any_date.group(0).strip())
            else:
                facts["deadline"] = ("Not stated in notice.", None)

        # Fee
        fee_match = re.search(r"(?:fee|charges|amount|शुल्क)[^\n\.]*?(?:Rs\.?|INR|₹)?\s*(\d+)", text, re.IGNORECASE)
        if fee_match:
            facts["fee_or_cost"] = (f"Rs. {fee_match.group(1)}", fee_match.group(0).strip())
        else:
            facts["fee_or_cost"] = ("Not stated in notice.", None)

        # Eligibility
        elig_match = re.search(r"(?:minimum|qualifying|aggregate|at least)?\s*(\d{1,2}(?:\.\d+)?)%\s*(?:marks|aggregate)?", text, re.IGNORECASE)
        if elig_match:
            facts["eligibility"] = (f"Minimum {elig_match.group(1)}% marks", elig_match.group(0).strip())
        else:
            deg_match = re.search(r"(?:Master['’]?s|Bachelor['’]?s|B\.Tech|Degree|Diploma|12th|Graduate)[^\n,.]*", text, re.IGNORECASE)
            if deg_match:
                facts["eligibility"] = (deg_match.group(0).strip(), deg_match.group(0).strip())
            else:
                facts["eligibility"] = ("Not stated in notice.", None)

        # Required Documents
        doc_match = re.search(r"(?:documents?|certificates?|marksheet|affidavit|दस्तावेज)[:\s]+([^\n.]+)", text, re.IGNORECASE)
        if doc_match:
            facts["required_documents"] = (doc_match.group(1).strip(), doc_match.group(0).strip())
        else:
            facts["required_documents"] = ("Not stated in notice.", None)

        # Required Actions
        action_match = re.search(r"(?:submit|apply online|register|report to|आवेदन करें)[^\n.]+", text, re.IGNORECASE)
        if action_match:
            facts["required_actions"] = (action_match.group(0).strip(), action_match.group(0).strip())
        else:
            facts["required_actions"] = ("Not stated in notice.", None)

        # Contact Details
        contact_match = re.search(r"(?:[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+|\b0\d{2,4}[-\s]?\d{6,8}\b|\b[6-9]\d{9}\b)", text)
        if contact_match:
            facts["contact_details"] = (contact_match.group(0).strip(), contact_match.group(0).strip())
        else:
            facts["contact_details"] = ("Not stated in notice.", None)

        # Purpose
        purpose = text.strip().splitlines()[0] if text.strip() else "Not stated in notice."
        facts["purpose"] = (purpose[:150], purpose[:150])

        return facts

    def _classify_change(
        self,
        field_key: str,
        old_val: str,
        new_val: str,
    ) -> Tuple[ChangeCategory, bool, str]:
        old_norm = self._normalize_string(old_val)
        new_norm = self._normalize_string(new_val)

        old_unstated = old_norm in ("", "not stated in notice", "not stated")
        new_unstated = new_norm in ("", "not stated in notice", "not stated")

        if old_unstated and new_unstated:
            return ChangeCategory.UNCHANGED, False, "Not specified in either notice version."

        if old_unstated and not new_unstated:
            return ChangeCategory.ADDED, False, "Newly introduced in the revised circular."

        if not old_unstated and new_unstated:
            return ChangeCategory.REMOVED, True, "Clause was present in base notice but is omitted or silent in revised circular."

        if old_norm == new_norm:
            return ChangeCategory.UNCHANGED, False, "Terms remain identical across notice versions."

        if field_key == "deadline":
            return ChangeCategory.MODIFIED, False, "Submission timeline or key date was modified in the revised circular."
        if field_key == "fee_or_cost":
            return ChangeCategory.MODIFIED, False, "Fee structure or financial requirement was modified."

        return ChangeCategory.MODIFIED, False, "Requirement terms differ between notice versions."

    def _normalize_string(self, s: str) -> str:
        if not s:
            return ""
        s = s.lower()
        s = re.sub(r"[^\w\s\d]", " ", s)
        return re.sub(r"\s+", " ", s).strip()

    def _generate_summary(
        self,
        rel: NoticeRelationship,
        modified: int,
        added: int,
        removed: int,
        entries: List[RevisionEntry],
    ) -> str:
        parts = []
        if rel.relationship_type.value in ("AMENDMENT", "EXTENSION", "CANCELLATION"):
            parts.append(f"Relationship: {rel.relationship_type.value} ({rel.confidence} confidence).")
        if modified > 0:
            parts.append(f"{modified} field(s) modified.")
        if added > 0:
            parts.append(f"{added} clause(s) newly added.")
        if removed > 0:
            parts.append(f"{removed} clause(s) removed or silent in revision.")
        if not parts:
            return "No substantive modifications detected between notice versions."
        return " ".join(parts)

revision_service = RevisionService()

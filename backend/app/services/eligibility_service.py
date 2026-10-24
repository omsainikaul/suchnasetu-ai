import re
from typing import List, Optional, Tuple, Dict, Any
from app.schemas.models import (
    CriterionType,
    EvaluationStatus,
    EligibilityCriterion,
    ApplicantProfile,
    CriterionEvaluationResult,
    EligibilityAssessment,
)

class EligibilityService:
    """
    Pure Python deterministic eligibility evaluation engine.
    Epistemic honesty: outputs PASS, FAIL, or UNKNOWN with verbatim source citations.
    """

    def extract_criteria(self, notice_text: str) -> List[EligibilityCriterion]:
        """
        Parses notice text into machine-evaluable criteria.
        """
        criteria: List[EligibilityCriterion] = []
        if not notice_text or not notice_text.strip():
            return [
                EligibilityCriterion(
                    id="crit_general_0",
                    criterion_type=CriterionType.OTHER,
                    description="General Eligibility Requirements",
                    operator="==",
                    threshold_value="Not stated in notice.",
                    evidence_quote="No specific eligibility rules stated in notice.",
                )
            ]

        # 1. Age Limit Criterion
        age_crit = self._extract_age_criterion(notice_text)
        if age_crit:
            criteria.append(age_crit)

        # 2. Percentage / Marks Criterion
        marks_crit = self._extract_marks_criterion(notice_text)
        if marks_crit:
            criteria.append(marks_crit)

        # 3. Qualification / Degree Criterion
        qual_crit = self._extract_qualification_criterion(notice_text)
        if qual_crit:
            criteria.append(qual_crit)

        # 4. Fallback if no specific numerical criteria matched
        if not criteria:
            elig_match = re.search(r"(?:eligibility|qualification|who\s+can\s+apply|पात्रता)[:\s]+([^\n.]+)", notice_text, re.IGNORECASE)
            desc = elig_match.group(1).strip() if elig_match else "General applicant terms stated in circular."
            quote = elig_match.group(0).strip() if elig_match else notice_text[:200]
            criteria.append(
                EligibilityCriterion(
                    id="crit_text_0",
                    criterion_type=CriterionType.OTHER,
                    description=desc[:200],
                    operator="CONTAINS",
                    threshold_value=desc[:100],
                    evidence_quote=quote[:300],
                )
            )

        return criteria

    def evaluate_profile(
        self,
        criteria: List[EligibilityCriterion],
        profile: ApplicantProfile,
        session_id: Optional[str] = None,
    ) -> EligibilityAssessment:
        """
        Evaluates an ApplicantProfile against notice criteria with explainable reasoning.
        """
        results: List[CriterionEvaluationResult] = []
        has_fail = False
        has_unknown = False

        for crit in criteria:
            if crit.criterion_type == CriterionType.AGE:
                res = self._evaluate_age(crit, profile)
            elif crit.criterion_type == CriterionType.PERCENTAGE:
                res = self._evaluate_marks(crit, profile)
            elif crit.criterion_type == CriterionType.QUALIFICATION:
                res = self._evaluate_qualification(crit, profile)
            else:
                res = CriterionEvaluationResult(
                    criterion_id=crit.id,
                    criterion_type=crit.criterion_type,
                    description=crit.description,
                    status=EvaluationStatus.UNKNOWN,
                    applicant_value=profile.notes or "Not evaluated",
                    requirement_value=crit.threshold_value,
                    evidence_quote=crit.evidence_quote,
                    explanation="General or qualitative requirement. Manual verification with official notice advised.",
                    missing_info="Manual verification needed",
                )

            if res.status == EvaluationStatus.FAIL:
                has_fail = True
            elif res.status == EvaluationStatus.UNKNOWN:
                has_unknown = True

            results.append(res)

        if has_fail:
            overall = "NOT_ELIGIBLE"
            summary = "One or more mandatory eligibility criteria were not satisfied."
        elif has_unknown:
            overall = "INCONCLUSIVE"
            summary = "Certain criteria could not be evaluated due to missing applicant information or qualitative notice terms."
        else:
            overall = "ELIGIBLE"
            summary = "All evaluated eligibility criteria appear to be satisfied based on available documentation."

        return EligibilityAssessment(
            session_id=session_id,
            overall_status=overall,
            results=results,
            summary=summary,
        )

    # -------------------------------------------------------------
    # Extraction Helpers
    # -------------------------------------------------------------

    def _extract_age_criterion(self, text: str) -> Optional[EligibilityCriterion]:
        m_range = re.search(r"(\d{2})\s*(?:to|-|and)\s*(\d{2})\s*years", text, re.IGNORECASE)
        m_max = re.search(r"(?:maximum|not\s+exceed|under|upto|up\s+to|age\s+limit\s*(?:is|:)?)\s*(\d{2})\s*years", text, re.IGNORECASE)
        m_min = re.search(r"(?:minimum|at\s+least|above)\s*(\d{2})\s*years", text, re.IGNORECASE)

        if not m_range and not m_max and not m_min:
            return None

        relaxations: Dict[str, str] = {}
        for cat in ["OBC", "SC", "ST", "PwD", "PH", "EWS"]:
            rel_m = re.search(rf"(\d+)\s*years?\s+(?:relaxation\s+)?for\s+{cat}", text, re.IGNORECASE)
            if rel_m:
                relaxations[cat] = f"+{rel_m.group(1)} years"

        if m_range:
            min_age, max_age = m_range.group(1), m_range.group(2)
            desc = f"Applicant must be between {min_age} and {max_age} years of age"
            thresh = f"{min_age}-{max_age}"
            quote = m_range.group(0)
        elif m_max:
            max_age = m_max.group(1)
            desc = f"Applicant must not exceed {max_age} years of age"
            thresh = f"<={max_age}"
            quote = m_max.group(0)
        else:
            min_age = m_min.group(1)
            desc = f"Applicant must be at least {min_age} years of age"
            thresh = f">={min_age}"
            quote = m_min.group(0)

        return EligibilityCriterion(
            id="crit_age_1",
            criterion_type=CriterionType.AGE,
            description=desc,
            operator="<=" if "<=" in thresh else ("RANGE" if "-" in thresh else ">="),
            threshold_value=thresh,
            evidence_quote=quote,
            category_relaxation=relaxations if relaxations else None,
        )

    def _extract_marks_criterion(self, text: str) -> Optional[EligibilityCriterion]:
        m = re.search(r"(?:minimum|at\s+least|aggregate\s+of|with)?\s*(\d{1,2}(?:\.\d+)?)%\s*(?:marks|aggregate)?", text, re.IGNORECASE)
        if not m:
            return None
        pct = m.group(1)
        return EligibilityCriterion(
            id="crit_marks_1",
            criterion_type=CriterionType.PERCENTAGE,
            description=f"Minimum {pct}% marks or equivalent CGPA in qualifying examination",
            operator=">=",
            threshold_value=f"{pct}%",
            evidence_quote=m.group(0).strip(),
        )

    def _extract_qualification_criterion(self, text: str) -> Optional[EligibilityCriterion]:
        degree_patterns = [
            r"\b(B\.?E\.?|B\.?Tech|M\.?E\.?|M\.?Tech|M\.?Sc|B\.?Sc|B\.?Com|M\.?Com|B\.?A|M\.?A|MBA|MCA|Ph\.?D|Diploma|10\+2|12th\s+Pass|Graduate|Post\s+Graduate)\b",
        ]
        found = []
        for pat in degree_patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            found.extend(matches)
        if not found:
            return None

        unique_degs = list(dict.fromkeys(found))
        deg_str = ", ".join(unique_degs)
        return EligibilityCriterion(
            id="crit_qual_1",
            criterion_type=CriterionType.QUALIFICATION,
            description=f"Qualifying degree required: {deg_str}",
            operator="CONTAINS",
            threshold_value=deg_str,
            evidence_quote=deg_str,
        )

    # -------------------------------------------------------------
    # Evaluators
    # -------------------------------------------------------------

    def _evaluate_age(self, crit: EligibilityCriterion, profile: ApplicantProfile) -> CriterionEvaluationResult:
        if profile.age is None:
            return CriterionEvaluationResult(
                criterion_id=crit.id,
                criterion_type=crit.criterion_type,
                description=crit.description,
                status=EvaluationStatus.UNKNOWN,
                applicant_value="Age not provided in profile",
                requirement_value=crit.threshold_value,
                evidence_quote=crit.evidence_quote,
                explanation="Applicant age was not supplied in profile.",
                missing_info="Applicant age / date of birth",
            )

        app_age = profile.age
        thresh = crit.threshold_value

        # Calculate applicable relaxation
        relax_years = 0
        if crit.category_relaxation and profile.category:
            cat_upper = profile.category.upper()
            if cat_upper in crit.category_relaxation:
                m_rel = re.search(r"\+(\d+)", crit.category_relaxation[cat_upper])
                if m_rel:
                    relax_years = int(m_rel.group(1))

        if "-" in thresh:
            min_s, max_s = thresh.split("-")
            min_a, max_a = int(min_s), int(max_s) + relax_years
            if min_a <= app_age <= max_a:
                return CriterionEvaluationResult(
                    criterion_id=crit.id,
                    criterion_type=crit.criterion_type,
                    description=crit.description,
                    status=EvaluationStatus.PASS,
                    applicant_value=f"{app_age} years old (Category: {profile.category or 'GEN'})",
                    requirement_value=f"{min_a}-{max_a} years (Relaxation: +{relax_years} yrs)",
                    evidence_quote=crit.evidence_quote,
                    explanation=f"Applicant age ({app_age}) is within the admissible bracket [{min_a}-{max_a}].",
                )
            else:
                return CriterionEvaluationResult(
                    criterion_id=crit.id,
                    criterion_type=crit.criterion_type,
                    description=crit.description,
                    status=EvaluationStatus.FAIL,
                    applicant_value=f"{app_age} years old",
                    requirement_value=f"{min_a}-{max_a} years",
                    evidence_quote=crit.evidence_quote,
                    explanation=f"Applicant age ({app_age}) falls outside the allowable bracket [{min_a}-{max_a}].",
                )
        elif "<=" in thresh:
            max_a = int(thresh.replace("<=", "").strip()) + relax_years
            if app_age <= max_a:
                return CriterionEvaluationResult(
                    criterion_id=crit.id,
                    criterion_type=crit.criterion_type,
                    description=crit.description,
                    status=EvaluationStatus.PASS,
                    applicant_value=f"{app_age} years old",
                    requirement_value=f"<={max_a} years",
                    evidence_quote=crit.evidence_quote,
                    explanation=f"Applicant age ({app_age}) satisfies the maximum limit ({max_a} years).",
                )
            else:
                return CriterionEvaluationResult(
                    criterion_id=crit.id,
                    criterion_type=crit.criterion_type,
                    description=crit.description,
                    status=EvaluationStatus.FAIL,
                    applicant_value=f"{app_age} years old",
                    requirement_value=f"<={max_a} years",
                    evidence_quote=crit.evidence_quote,
                    explanation=f"Applicant age ({app_age}) exceeds the permissible upper limit ({max_a} years).",
                )

        return CriterionEvaluationResult(
            criterion_id=crit.id,
            criterion_type=crit.criterion_type,
            description=crit.description,
            status=EvaluationStatus.UNKNOWN,
            applicant_value=str(app_age),
            requirement_value=crit.threshold_value,
            evidence_quote=crit.evidence_quote,
            explanation="Unusual age specification requiring manual verification.",
        )

    def _evaluate_marks(self, crit: EligibilityCriterion, profile: ApplicantProfile) -> CriterionEvaluationResult:
        pct = profile.percentage
        if pct is None and profile.cgpa is not None:
            # Common Indian 10-point conversion approximation (CGPA * 9.5)
            pct = round(profile.cgpa * 9.5, 2)

        if pct is None:
            return CriterionEvaluationResult(
                criterion_id=crit.id,
                criterion_type=crit.criterion_type,
                description=crit.description,
                status=EvaluationStatus.UNKNOWN,
                applicant_value="Marks/CGPA not specified in profile",
                requirement_value=crit.threshold_value,
                evidence_quote=crit.evidence_quote,
                explanation="Applicant qualifying score is missing from profile.",
                missing_info="Marks percentage or CGPA",
            )

        thresh_pct = float(crit.threshold_value.replace("%", "").strip())
        if pct >= thresh_pct:
            return CriterionEvaluationResult(
                criterion_id=crit.id,
                criterion_type=crit.criterion_type,
                description=crit.description,
                status=EvaluationStatus.PASS,
                applicant_value=f"{pct}%",
                requirement_value=f">={thresh_pct}%",
                evidence_quote=crit.evidence_quote,
                explanation=f"Applicant score of {pct}% satisfies the minimum threshold of {thresh_pct}%.",
            )
        else:
            return CriterionEvaluationResult(
                criterion_id=crit.id,
                criterion_type=crit.criterion_type,
                description=crit.description,
                status=EvaluationStatus.FAIL,
                applicant_value=f"{pct}%",
                requirement_value=f">={thresh_pct}%",
                evidence_quote=crit.evidence_quote,
                explanation=f"Applicant score of {pct}% is below the mandatory requirement of {thresh_pct}%.",
            )

    def _evaluate_qualification(self, crit: EligibilityCriterion, profile: ApplicantProfile) -> CriterionEvaluationResult:
        if not profile.qualifications:
            return CriterionEvaluationResult(
                criterion_id=crit.id,
                criterion_type=crit.criterion_type,
                description=crit.description,
                status=EvaluationStatus.UNKNOWN,
                applicant_value="No qualifications listed in profile",
                requirement_value=crit.threshold_value,
                evidence_quote=crit.evidence_quote,
                explanation="Applicant degree/qualification list is empty.",
                missing_info="Applicant educational qualifications",
            )

        req_tokens = [t.strip().lower() for t in crit.threshold_value.split(",")]
        app_quals = [q.strip().lower() for q in profile.qualifications]

        matched = any(any(req in app_q or app_q in req for app_q in app_quals) for req in req_tokens)
        if matched:
            return CriterionEvaluationResult(
                criterion_id=crit.id,
                criterion_type=crit.criterion_type,
                description=crit.description,
                status=EvaluationStatus.PASS,
                applicant_value=", ".join(profile.qualifications),
                requirement_value=crit.threshold_value,
                evidence_quote=crit.evidence_quote,
                explanation=f"Applicant holds qualifying credential matching notice criteria ({crit.threshold_value}).",
            )
        else:
            return CriterionEvaluationResult(
                criterion_id=crit.id,
                criterion_type=crit.criterion_type,
                description=crit.description,
                status=EvaluationStatus.UNKNOWN,
                applicant_value=", ".join(profile.qualifications),
                requirement_value=crit.threshold_value,
                evidence_quote=crit.evidence_quote,
                explanation=f"Applicant degree list does not explicitly list {crit.threshold_value}. Equivalent degree evaluation recommended.",
            )

eligibility_service = EligibilityService()

import json
import logging
import re
from typing import Dict, Any, Optional, Tuple
import httpx
from app.core.config import settings
from app.core.prompts import (
    SYSTEM_NOTICE_ANALYZER_PROMPT,
    QA_SYSTEM_PROMPT,
    build_analysis_prompt,
    build_qa_prompt
)

logger = logging.getLogger(__name__)

class GemmaAdapter:
    def __init__(self):
        self.provider = settings.MODEL_PROVIDER
        self.model_name = settings.GEMMA_MODEL_NAME
        self.openrouter_key = settings.OPENROUTER_API_KEY
        self.hf_key = settings.HUGGINGFACE_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY

    def is_live_configured(self) -> bool:
        """Check if a real Gemma 4 live inference provider is configured with credentials."""
        if self.provider == "openrouter" and self.openrouter_key:
            return True
        if self.provider == "huggingface" and self.hf_key:
            return True
        if self.provider == "gemini" and self.gemini_key:
            return True
        if self.provider == "ollama":
            return True
        return False

    async def _call_openrouter(self, system_prompt: str, user_prompt: str) -> str:
        """Call official Gemma 4 model via OpenRouter API."""
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "https://suchnasetu.ai",
            "X-Title": "SuchnaSetu AI HackDay 2026",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,  # Low temperature for factual precision
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def _call_gemini(self, system_prompt: str, user_prompt: str) -> str:
        """Call Google Gemini / AI Studio API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """Call local Ollama Gemma 4 instance."""
        payload = {
            "model": "gemma4:latest",
            "prompt": f"{system_prompt}\n\n{user_prompt}",
            "stream": False,
            "format": "json"
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "{}")

    def _extract_json_block(self, text: str) -> Dict[str, Any]:
        """Extract and parse clean JSON from model output."""
        cleaned = text.strip()
        # Remove markdown codeblocks if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # Find first { and last }
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            cleaned = cleaned[start:end+1]

        return json.loads(cleaned)

    async def analyze_notice(
        self,
        notice_text: str,
        language: str = "en",
        reading_level: str = "standard"
    ) -> Tuple[Dict[str, Any], bool, str]:
        """
        Analyze the notice text using Gemma 4.
        Returns: (parsed_json, is_mock, model_identifier)
        """
        user_prompt = build_analysis_prompt(notice_text, language, reading_level)

        if self.is_live_configured():
            try:
                raw_response = ""
                if self.provider == "openrouter":
                    raw_response = await self._call_openrouter(SYSTEM_NOTICE_ANALYZER_PROMPT, user_prompt)
                elif self.provider == "gemini":
                    raw_response = await self._call_gemini(SYSTEM_NOTICE_ANALYZER_PROMPT, user_prompt)
                elif self.provider == "ollama":
                    raw_response = await self._call_ollama(SYSTEM_NOTICE_ANALYZER_PROMPT, user_prompt)
                else:
                    raise ValueError(f"Unsupported provider: {self.provider}")

                parsed = self._extract_json_block(raw_response)
                return parsed, False, f"{self.model_name} (Live via {self.provider})"
            except Exception as e:
                logger.error(f"Live Gemma 4 inference failed ({e}). Falling back to deterministic grounding engine.")

        # Fallback to deterministic offline grounding engine
        parsed = self._deterministic_grounded_analysis(notice_text, language, reading_level)
        return parsed, True, "Gemma 4 (Deterministic Evaluation Adapter - Offline / No API Key)"

    async def answer_question(
        self,
        notice_text: str,
        question: str,
        language: str = "en"
    ) -> Tuple[Dict[str, Any], bool, str]:
        """
        Answer user question strictly grounded in the notice text.
        Returns: (parsed_json, is_mock, model_identifier)
        """
        user_prompt = build_qa_prompt(notice_text, question, language)

        if self.is_live_configured():
            try:
                raw_response = ""
                if self.provider == "openrouter":
                    raw_response = await self._call_openrouter(QA_SYSTEM_PROMPT, user_prompt)
                elif self.provider == "gemini":
                    raw_response = await self._call_gemini(QA_SYSTEM_PROMPT, user_prompt)
                elif self.provider == "ollama":
                    raw_response = await self._call_ollama(QA_SYSTEM_PROMPT, user_prompt)
                else:
                    raise ValueError(f"Unsupported provider: {self.provider}")

                parsed = self._extract_json_block(raw_response)
                return parsed, False, f"{self.model_name} (Live via {self.provider})"
            except Exception as e:
                logger.error(f"Live Gemma 4 Q&A failed ({e}). Falling back to deterministic grounding engine.")

        # Fallback deterministic QA
        parsed = self._deterministic_grounded_qa(notice_text, question, language)
        return parsed, True, "Gemma 4 (Deterministic Evaluation Adapter - Offline / No API Key)"

    def _deterministic_grounded_analysis(
        self,
        notice_text: str,
        language: str = "en",
        reading_level: str = "standard"
    ) -> Dict[str, Any]:
        """
        Deterministic, rule-and-evidence grounded analysis for testing and offline execution.
        Follows PS 02 requirements with 100% strictness: no hallucinated missing fields.
        """
        lines = [line.strip() for line in notice_text.split("\n") if line.strip()]
        lower_text = notice_text.lower()

        # 1. Title
        title = lines[0] if lines else "Public Notice"
        if len(title) > 80:
            title = title[:77] + "..."

        # 2. Extract Deadline
        # Look for dates
        deadline_patterns = [
            r'(?:last date|deadline|due date|submit by|valid till|दिनांक|अंतिम तिथि|समय सीमा)[:\s]+([^\n\.;]+)',
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})'
        ]
        deadline_val = None
        deadline_ev = []
        for pat in deadline_patterns:
            match = re.search(pat, notice_text, re.IGNORECASE)
            if match:
                matched_str = match.group(0).strip()
                deadline_val = match.group(1).strip() if match.lastindex and match.lastindex >= 1 else matched_str
                # find full sentence containing match
                for line in lines:
                    if matched_str in line or deadline_val in line:
                        deadline_ev.append(line)
                        break
                break

        # 3. Extract Eligibility
        elig_patterns = [
            r'(?:eligibility|eligible candidates|who can apply|criteria|पात्रता|योग्यता)[:\s]+([^\n\.;]+)',
            r'(?:all students enrolled|open to students|candidates having|income less than|students with)[^\n\.;]+'
        ]
        elig_val = None
        elig_ev = []
        for pat in elig_patterns:
            match = re.search(pat, notice_text, re.IGNORECASE)
            if match:
                elig_val = match.group(0).strip()
                for line in lines:
                    if elig_val in line:
                        elig_ev.append(line)
                        break
                break

        # 4. Extract Required Documents
        doc_keywords = ["marksheet", "certificate", "aadhaar", "id card", "bonafide", "photograph", "income certificate", "ration card", "दस्तावेज", "प्रमाण पत्र", "अंकतालिका"]
        found_docs = []
        doc_ev = []
        for line in lines:
            if any(kw in line.lower() for kw in doc_keywords):
                found_docs.append(line)
                doc_ev.append(line)

        # 5. Extract Contact
        contact_patterns = [
            r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)',
            r'(?:contact|helpline|phone|email|toll free|helpdesk|संपर्क)[:\s]+([^\n\.;]+)',
            r'(\+?91[\-\s]?)?[6-9]\d{9}',
            r'(\d{3,5}[\-\s]?\d{6,8})'
        ]
        contact_val = None
        contact_ev = []
        for pat in contact_patterns:
            match = re.search(pat, notice_text, re.IGNORECASE)
            if match:
                contact_val = match.group(0).strip()
                for line in lines:
                    if contact_val in line:
                        contact_ev.append(line)
                        break
                break

        # 6. Extract Purpose
        purpose_patterns = [
            r'(?:subject|sub|purpose|regarding|ref|विषय|उद्देश्य)[:\s]+([^\n\.;]+)',
            r'(?:applications are invited for|this is to inform|notice is hereby given that|announces)[^\n\.;]+'
        ]
        purpose_val = None
        purpose_ev = []
        for pat in purpose_patterns:
            match = re.search(pat, notice_text, re.IGNORECASE)
            if match:
                purpose_val = match.group(0).strip()
                for line in lines:
                    if purpose_val in line:
                        purpose_ev.append(line)
                        break
                break
        if not purpose_val and len(lines) > 1:
            purpose_val = lines[1]
            purpose_ev = [lines[1]]

        # 7. Extract Action
        action_patterns = [
            r'(?:how to apply|action required|instructions|procedure|आवेदन कैसे करें|प्रक्रिया)[:\s]+([^\n\.;]+)',
            r'(?:submit your application|register online at|visit portal|fill out the form|report to)[^\n\.;]+'
        ]
        action_val = None
        action_ev = []
        for pat in action_patterns:
            match = re.search(pat, notice_text, re.IGNORECASE)
            if match:
                action_val = match.group(0).strip()
                for line in lines:
                    if action_val in line:
                        action_ev.append(line)
                        break
                break

        # Build Plain Language Summary
        summary = ""
        checklist = []
        limitations = []

        not_stated_en = "Not stated in notice."
        not_stated_hi = "सूचना में उल्लेखित नहीं है।"
        absent_val = not_stated_hi if language == "hi" else not_stated_en

        if language == "hi":
            title_hi = f"सूचना: {title}"
            summary_parts = []
            if purpose_val:
                summary_parts.append(f"यह सूचना {purpose_val} से संबंधित है।")
            if elig_val:
                summary_parts.append(f"पात्रता: {elig_val}।")
            if deadline_val:
                summary_parts.append(f"आवेदन की अंतिम तिथि {deadline_val} है।")
            else:
                summary_parts.append("सूचना में कोई अंतिम तिथि नहीं दी गई है।")
                limitations.append("अंतिम तिथि का उल्लेख नहीं है।")

            summary = " ".join(summary_parts) if summary_parts else "दिए गए नोटिस से मुख्य बिंदुओं का सारांश निकाला गया है।"
            
            # Checklist in Hindi
            step_num = 1
            checklist.append({
                "step_number": step_num,
                "action": "नोटिस में दी गई पात्रता शर्तों की जांच करें",
                "deadline": deadline_val,
                "documents_needed": found_docs[:2] if found_docs else [],
                "evidence": elig_ev[:1],
                "requires_confirmation": False
            })
            step_num += 1
            if found_docs:
                checklist.append({
                    "step_number": step_num,
                    "action": "आवश्यक दस्तावेजों को संकलित व प्रमाणित करें",
                    "deadline": deadline_val,
                    "documents_needed": found_docs,
                    "evidence": doc_ev[:1],
                    "requires_confirmation": False
                })
                step_num += 1
            checklist.append({
                "step_number": step_num,
                "action": action_val if action_val else "संबंधित कार्यालय या पोर्टल पर आवेदन जमा करें",
                "deadline": deadline_val,
                "documents_needed": [],
                "evidence": action_ev[:1],
                "requires_confirmation": False
            })
        else:
            summary_parts = []
            if purpose_val:
                summary_parts.append(f"This notice concerns {purpose_val}.")
            if elig_val:
                summary_parts.append(f"Eligibility applies to {elig_val}.")
            if deadline_val:
                summary_parts.append(f"The deadline is {deadline_val}.")
            else:
                summary_parts.append("No submission deadline is stated in the notice.")
                limitations.append("Submission deadline is not specified in notice.")

            if reading_level == "simpler":
                summary = "SUMMARY: " + " ".join(summary_parts)
            else:
                summary = " ".join(summary_parts) if summary_parts else "Extracted key actionable instructions from the official notice."

            # Checklist in English
            step_num = 1
            checklist.append({
                "step_number": step_num,
                "action": f"Verify your eligibility criteria: {elig_val or 'Review general notice terms'}",
                "deadline": deadline_val,
                "documents_needed": found_docs[:2] if found_docs else [],
                "evidence": elig_ev[:1],
                "requires_confirmation": False
            })
            step_num += 1
            if found_docs:
                checklist.append({
                    "step_number": step_num,
                    "action": "Prepare and verify all required documentation listed in notice",
                    "deadline": deadline_val,
                    "documents_needed": found_docs,
                    "evidence": doc_ev[:1],
                    "requires_confirmation": False
                })
                step_num += 1
            checklist.append({
                "step_number": step_num,
                "action": action_val if action_val else "Complete final submission through the designated official channel",
                "deadline": deadline_val,
                "documents_needed": [],
                "evidence": action_ev[:1],
                "requires_confirmation": False
            })

        return {
            "notice_title": title,
            "summary": summary,
            "fields": {
                "purpose": {
                    "value": purpose_val or absent_val,
                    "status": "found" if purpose_val else "not_stated",
                    "evidence": purpose_ev
                },
                "eligibility": {
                    "value": elig_val or absent_val,
                    "status": "found" if elig_val else "not_stated",
                    "evidence": elig_ev
                },
                "deadline": {
                    "value": deadline_val or absent_val,
                    "status": "found" if deadline_val else "not_stated",
                    "evidence": deadline_ev
                },
                "required_documents": {
                    "value": found_docs if found_docs else absent_val,
                    "status": "found" if found_docs else "not_stated",
                    "evidence": doc_ev
                },
                "contact": {
                    "value": contact_val or absent_val,
                    "status": "found" if contact_val else "not_stated",
                    "evidence": contact_ev
                },
                "action": {
                    "value": action_val or absent_val,
                    "status": "found" if action_val else "not_stated",
                    "evidence": action_ev
                }
            },
            "checklist": checklist,
            "limitations": limitations
        }

    def _deterministic_grounded_qa(
        self,
        notice_text: str,
        question: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Deterministic, strictly grounded QA matching PS 02 requirements:
        If question asks for missing information, explicitly returns not stated.
        """
        q_lower = question.lower()
        full_lower = notice_text.lower()
        lines = [line.strip() for line in notice_text.split("\n") if line.strip()]

        # Common absent topics to detect
        # E.g. income certificate, entrance exam, hostel fee, refund policy
        # If user asks about a term not in the notice at all
        not_stated_en = "This information is not stated in the supplied notice."
        not_stated_hi = "यह जानकारी उपलब्ध कराए गए नोटिस में उल्लेखित नहीं है।"

        # Extract keywords from question (excluding stopwords)
        stopwords = {"what", "is", "the", "are", "of", "in", "to", "for", "a", "an", "who", "where", "when", "how", "can", "i", "does", "any", "which", "कया", "है", "का", "की", "के", "में"}
        q_words = [w for w in re.findall(r'\w+', q_lower) if w not in stopwords and len(w) > 2]

        matched_lines = []
        for line in lines:
            line_l = line.lower()
            match_count = sum(1 for w in q_words if w in line_l)
            if match_count > 0:
                matched_lines.append((match_count, line))

        matched_lines.sort(key=lambda x: x[0], reverse=True)

        # Specific missing requirement check:
        # If user asks about specific qualifiers (income, fee, caste, hostel, quota, refund, age, etc.)
        # that are NOT mentioned anywhere in the notice:
        specific_qualifiers = [
            "income", "caste", "hostel", "fee", "fees", "quota", "refund", "age",
            "reservation", "exam", "syllabus", "interview date", "admit card",
            "आय", "जाति", "शुल्क", "फीस", "आरक्षण", "छात्रावास"
        ]
        for qualifier in specific_qualifiers:
            if qualifier in q_lower and qualifier not in full_lower:
                ans_en = f"This information regarding '{qualifier}' is not stated in the supplied notice."
                ans_hi = f"सूचना में '{qualifier}' के संबंध में कोई जानकारी उल्लेखित नहीं है (यह सूचना में नहीं दी गई है)।"
                return {
                    "answer": ans_hi if language == "hi" else ans_en,
                    "is_stated_in_notice": False,
                    "status": "not_stated_in_notice",
                    "evidence": []
                }

        # Check for specific queries
        if any(w in q_lower for w in ["deadline", "last date", "due date", "अंतिम तिथि", "समय सीमा"]):
            date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})', notice_text, re.IGNORECASE)
            if date_match:
                ev = date_match.group(0)
                ans = f"अंतिम तिथि {ev} है।" if language == "hi" else f"The deadline is {ev}."
                return {
                    "answer": ans,
                    "is_stated_in_notice": True,
                    "status": "answered_from_notice",
                    "evidence": [ev]
                }
            else:
                return {
                    "answer": "सूचना में आवेदन की अंतिम तिथि का कोई उल्लेख नहीं है।" if language == "hi" else "No deadline or submission date is stated in the notice.",
                    "is_stated_in_notice": False,
                    "status": "not_stated_in_notice",
                    "evidence": []
                }

        if any(w in q_lower for w in ["eligib", "who can", "पात्रता", "योग्यता"]):
            for count, line in matched_lines:
                if any(k in line.lower() for k in ["eligib", "students", "candidates", "पात्र", "योग्य"]):
                    ans = f"पात्रता मानदंड: {line}" if language == "hi" else f"According to the notice: {line}"
                    return {
                        "answer": ans,
                        "is_stated_in_notice": True,
                        "status": "answered_from_notice",
                        "evidence": [line]
                    }

        if any(w in q_lower for w in ["document", "certificate", "दस्तावेज", "प्रमाण पत्र"]):
            doc_lines = [l for _, l in matched_lines if any(k in l.lower() for k in ["marksheet", "certificate", "id", "photo", "दस्तावेज", "प्रमाण"])]
            if doc_lines:
                ev = doc_lines[0]
                ans = f"आवश्यक दस्तावेज: {ev}" if language == "hi" else f"Required documents listed: {ev}"
                return {
                    "answer": ans,
                    "is_stated_in_notice": True,
                    "status": "answered_from_notice",
                    "evidence": [ev]
                }

        # If question has meaningful keywords but NONE appear in notice -> explicitly NOT STATED
        if q_words and not any(w in full_lower for w in q_words):
            return {
                "answer": not_stated_hi if language == "hi" else not_stated_en,
                "is_stated_in_notice": False,
                "status": "not_stated_in_notice",
                "evidence": []
            }

        if matched_lines:
            best_line = matched_lines[0][1]
            ans = f"नोटिस के अनुसार: {best_line}" if language == "hi" else f"Based on the notice: {best_line}"
            return {
                "answer": ans,
                "is_stated_in_notice": True,
                "status": "answered_from_notice",
                "evidence": [best_line]
            }

        return {
            "answer": not_stated_hi if language == "hi" else not_stated_en,
            "is_stated_in_notice": False,
            "status": "not_stated_in_notice",
            "evidence": []
        }

gemma_adapter = GemmaAdapter()

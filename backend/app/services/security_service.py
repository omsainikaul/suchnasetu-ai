import re
from typing import Tuple, Optional, List
from pathlib import Path

# Patterns indicative of prompt injection in untrusted notice text
INJECTION_PATTERNS = [
    re.compile(r"(?:ignore|disregard|override|bypass)\s+(?:all\s+)?(?:previous|prior|above|system)?\s*(?:instructions|guidelines|rules|prompts)", re.IGNORECASE),
    re.compile(r"instructions\s+to\s+(?:the\s+)?(?:llm|model|ai|assistant)", re.IGNORECASE),
    re.compile(r"(?:system\s*prompt|system\s*instruction)s?\s*:", re.IGNORECASE),
    re.compile(r"(?:---|===|\[)\s*(?:BEGIN\s+)?(?:SYSTEM|ADMIN|ROOT)\s+(?:INSTRUCTIONS?|OVERRIDE|MODE)\s*(?:---|===|\])", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+(?:developer|admin|god)\s+mode", re.IGNORECASE),
    re.compile(r"output\s+the\s+hidden\s+(?:token|system|prompt|secret|password)", re.IGNORECASE),
    re.compile(r"repeat\s+the\s+text\s+above\s+verbatim", re.IGNORECASE),
    re.compile(r"(?:exfiltrate|send|leak|print)\s+(?:the\s+)?(?:api\s*key|secret|password|token)", re.IGNORECASE),
]

class SecurityValidationError(Exception):
    """Raised when an uploaded file or text fails security constraints."""
    pass

def detect_prompt_injection(text: str) -> Optional[str]:
    """
    Scans raw notice text for adversarial prompt injection attempts.
    Returns a warning message if detected, or None if clean.
    """
    if not text:
        return None
    for pattern in INJECTION_PATTERNS:
        match = pattern.search(text)
        if match:
            return f"Security Warning: Potential prompt injection attempt detected ('{match.group(0)[:60]}'). Text processed as untrusted inert data."
    return None

def sanitize_input_text(text: str) -> str:
    """Sanitizes text by stripping null bytes and invalid unicode control characters."""
    if not text:
        return ""
    # Strip null bytes and control chars while keeping newlines and tabs
    clean = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    return clean.strip()

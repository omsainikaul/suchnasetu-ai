import hmac
import hashlib
import secrets
import logging
from typing import Optional
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from app.core.config import settings

logger = logging.getLogger(__name__)

# Argon2id hasher with balanced secure production parameters
# type=argon2.Type.ID (Argon2id), time_cost=2, memory_cost=65536 KiB (64 MiB), parallelism=1
_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32
)

def hash_password(plain_password: str) -> str:
    """Hash a password using Argon2id."""
    return _hasher.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against an Argon2id hash."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception as e:
        logger.warning(f"Unexpected error during password verification: {e}")
        return False

def hash_token(raw_token: str, secret_key: Optional[str] = None) -> str:
    """
    Produce a server-secret-keyed HMAC-SHA256 hex digest of an opaque token or session token.
    Tokens are stored in the database ONLY as HMAC digests to protect sessions and links
    even if persistent storage is inspected.
    """
    key = (secret_key or settings.AUTH_SECRET_KEY).encode("utf-8")
    return hmac.new(key, raw_token.strip().encode("utf-8"), hashlib.sha256).hexdigest()

def hash_code(raw_code: str, secret_key: Optional[str] = None) -> str:
    """
    Produce a server-secret-keyed HMAC-SHA256 hex digest of a 6-digit numeric recovery/verification code.
    Because 6-digit numeric codes have only 1,000,000 possible states (000000 - 999999), plain hashing
    (such as plain SHA-256) is vulnerable to offline precomputation and rainbow tables.
    Using a server-secret-keyed HMAC guarantees that an offline attacker cannot evaluate the digest
    without the server's private secret key.
    """
    key = (secret_key or settings.AUTH_SECRET_KEY).encode("utf-8")
    return hmac.new(key, raw_code.strip().encode("utf-8"), hashlib.sha256).hexdigest()

def verify_code(raw_code: str, stored_hash: str, secret_key: Optional[str] = None) -> bool:
    """Verify a 6-digit code against its stored HMAC digest using constant-time comparison."""
    expected_hash = hash_code(raw_code, secret_key)
    return hmac.compare_digest(expected_hash, stored_hash)

def verify_token_hash(raw_token: str, stored_hash: str, secret_key: Optional[str] = None) -> bool:
    """Verify an opaque token against its stored HMAC digest using constant-time comparison."""
    expected_hash = hash_token(raw_token, secret_key)
    return hmac.compare_digest(expected_hash, stored_hash)

def generate_secure_token(nbytes: int = 32) -> str:
    """Generate a high-entropy URL-safe cryptographic token (e.g. for reset links)."""
    return secrets.token_urlsafe(nbytes)

def generate_secure_code(digits: int = 6) -> str:
    """Generate a cryptographically secure numeric code (e.g. 6-digit recovery code)."""
    min_val = 10 ** (digits - 1)
    max_val = (10 ** digits) - 1
    code = secrets.randbelow(max_val - min_val + 1) + min_val
    return str(code)

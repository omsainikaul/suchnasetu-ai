import time
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from app.db.database import get_db_connection
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    hash_token,
    hash_code,
    verify_code,
    generate_secure_token,
    generate_secure_code,
)
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

def _mask_email(addr: str) -> str:
    if not addr or "@" not in addr:
        return "unknown"
    u, d = addr.split("@", 1)
    return (u[:2] + "***" if len(u) > 2 else "***") + "@" + d

class AuthService:
    """Core authentication, session, verification, and recovery business logic."""

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _expires_iso(hours: Optional[int] = None, minutes: Optional[int] = None) -> str:
        delta = timedelta(hours=hours or 0, minutes=minutes or 0)
        return (datetime.now(timezone.utc) + delta).isoformat()

    @staticmethod
    def _is_expired(expiry_iso: str) -> bool:
        try:
            exp = datetime.fromisoformat(expiry_iso)
            return datetime.now(timezone.utc) > exp
        except Exception:
            return True

    # --------------------------------------------------------------------------
    # Rate Limiting Helper
    # --------------------------------------------------------------------------
    async def check_rate_limit(self, key: str, max_requests: int, window_seconds: float) -> bool:
        """
        Token-bucket rate limiter backed by SQLite.
        Returns True if within limit, False if limit exceeded.
        """
        now = time.time()
        async with get_db_connection() as conn:
            async with conn.execute("SELECT count, window_start FROM rate_limits WHERE key = ?", (key,)) as cursor:
                row = await cursor.fetchone()

            if not row:
                await conn.execute(
                    "INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)",
                    (key, now)
                )
                await conn.commit()
                return True

            count, window_start = row["count"], row["window_start"]
            if now - window_start > window_seconds:
                # Window expired, reset
                await conn.execute(
                    "UPDATE rate_limits SET count = 1, window_start = ? WHERE key = ?",
                    (now, key)
                )
                await conn.commit()
                return True
            elif count >= max_requests:
                return False
            else:
                await conn.execute(
                    "UPDATE rate_limits SET count = count + 1 WHERE key = ?",
                    (key,)
                )
                await conn.commit()
                return True

    # --------------------------------------------------------------------------
    # Registration & Email Verification
    # --------------------------------------------------------------------------
    async def register_user(self, name: str, email: str, password: str, client_ip: str = "unknown") -> Dict[str, Any]:
        """Register a new citizen account with email verification enforcement."""
        normalized_email = email.strip().lower()

        # Enforce rate limit on registrations: max 5 per 10 minutes per IP
        if not await self.check_rate_limit(f"reg_ip:{client_ip}", 5, 600):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many registration attempts. Please wait a few minutes before trying again."
            )

        # Check password strength
        if len(password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long."
            )
        if len(password) > 128:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password cannot exceed 128 characters."
            )

        async with get_db_connection() as conn:
            # Stage 1: Account lookup
            logger.info(f"[STAGE 1: ACCOUNT LOOKUP] Checking existing accounts for registration: recipient={_mask_email(normalized_email)}")
            async with conn.execute("SELECT id, name, is_verified FROM users WHERE email = ?", (normalized_email,)) as cursor:
                existing = await cursor.fetchone()

            if existing:
                if existing["is_verified"]:
                    # Account already active and verified
                    logger.info(
                        f"[STAGE 1: ACCOUNT LOOKUP] Registration attempted for existing ALREADY VERIFIED user_id={existing['id'][:8]} "
                        f"recipient={_mask_email(normalized_email)}. Bypassing email generation."
                    )
                    return {
                        "status": "success",
                        "message": "Registration received. An account with this email address is already active and verified. Please sign in directly.",
                        "email_delivered": False,
                        "already_verified": True
                    }

                # Account exists but is unverified. Provide safe recovery path without creating duplicate accounts
                logger.info(
                    f"[STAGE 1: ACCOUNT LOOKUP] Existing UNVERIFIED account detected for recipient={_mask_email(normalized_email)}. "
                    f"Initiating verification email recovery dispatch."
                )
                can_resend = await self.check_rate_limit(f"resend:{normalized_email}", 1, 60)
                if not can_resend:
                    logger.info(f"[STAGE 2: RATE LIMIT] 60s resend cooldown active for recipient={_mask_email(normalized_email)}.")
                    return {
                        "status": "success",
                        "message": "Registration received. An unverified account already exists for this email. A verification message was recently sent. Please check your inbox or wait before requesting a new code.",
                        "email_delivered": True
                    }

                logger.info(f"[STAGE 3: VERIFICATION CREDENTIALS] Generating fresh verification token and 6-digit code for user_id={existing['id'][:8]}")
                verify_token = generate_secure_token(32)
                verify_code = generate_secure_code(6)
                token_expiry = self._expires_iso(hours=settings.AUTH_VERIFY_EXPIRE_HOURS)
                now = self._now_iso()

                # Dispatch email first before invalidating existing valid tokens
                delivery = await email_service.send_verification_email(
                    email=normalized_email,
                    name=existing["name"] or name.strip(),
                    token=verify_token,
                    code=verify_code
                )

                if delivery.success:
                    logger.info(f"[STAGE 8: RESPONSE CONSTRUCTION] Verification email dispatched successfully for existing user_id={existing['id'][:8]}.")
                    # Invalidate existing unused tokens and store new ones atomically
                    await conn.execute(
                        "UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND token_type LIKE 'verify_email%' AND used_at IS NULL",
                        (now, existing["id"])
                    )
                    await conn.execute(
                        """
                        INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                        VALUES (?, ?, 'verify_email', ?, 5, ?, ?)
                        """,
                        (str(uuid.uuid4()), existing["id"], hash_token(verify_token), token_expiry, now)
                    )
                    await conn.execute(
                        """
                        INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                        VALUES (?, ?, 'verify_email_code', ?, 5, ?, ?)
                        """,
                        (str(uuid.uuid4()), existing["id"], hash_code(verify_code), token_expiry, now)
                    )
                    await conn.commit()
                    return {
                        "status": "success",
                        "message": "Registration received. An unverified account already exists for this email. A fresh verification email has been sent.",
                        "email_delivered": True
                    }
                else:
                    # Delivery failed: preserve existing tokens and explain to user
                    logger.warning(f"[STAGE 8: RESPONSE CONSTRUCTION] Verification email delivery failed for user_id={existing['id'][:8]}: {delivery.message}. Preserving existing tokens.")
                    return {
                        "status": "warning",
                        "message": "An unverified account already exists for this email, but delivery of a fresh verification email could not be completed at this moment. Your existing verification code remains valid. Please retry from the verification screen.",
                        "email_delivered": False
                    }

            user_id = str(uuid.uuid4())
            pwd_hash = hash_password(password)
            now = self._now_iso()

            logger.info(f"[STAGE 1: ACCOUNT LOOKUP] Creating new citizen account user_id={user_id[:8]} for recipient={_mask_email(normalized_email)}")
            await conn.execute(
                """
                INSERT INTO users (id, email, name, password_hash, is_verified, created_at, updated_at)
                VALUES (?, ?, ?, ?, 0, ?, ?)
                """,
                (user_id, normalized_email, name.strip(), pwd_hash, now, now)
            )

            # Generate verification token & 6-digit code
            logger.info(f"[STAGE 3: VERIFICATION CREDENTIALS] Generating new verification credentials for user_id={user_id[:8]}")
            verify_token = generate_secure_token(32)
            verify_code = generate_secure_code(6)
            token_expiry = self._expires_iso(hours=settings.AUTH_VERIFY_EXPIRE_HOURS)

            # Store digest of link token
            await conn.execute(
                """
                INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                VALUES (?, ?, 'verify_email', ?, 5, ?, ?)
                """,
                (str(uuid.uuid4()), user_id, hash_token(verify_token), token_expiry, now)
            )

            # Store digest of 6-digit code with server-secret HMAC
            await conn.execute(
                """
                INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                VALUES (?, ?, 'verify_email_code', ?, 5, ?, ?)
                """,
                (str(uuid.uuid4()), user_id, hash_code(verify_code), token_expiry, now)
            )

            await conn.commit()

        # Send verification email
        delivery = await email_service.send_verification_email(
            email=normalized_email,
            name=name.strip(),
            token=verify_token,
            code=verify_code
        )

        if not delivery.success:
            logger.warning(f"Registration email delivery failed for user email domain {normalized_email.split('@')[-1]}: {delivery.message}")
            return {
                "status": "warning",
                "message": "Account created successfully, but the verification email could not be delivered at this moment due to mail server connectivity. Your account is preserved. Please proceed to the verification screen and click 'Resend Verification Email' to retry delivery.",
                "email_delivered": False
            }

        return {
            "status": "success",
            "message": "Account created successfully. Please check your email to verify your account.",
            "email_delivered": True
        }

    async def verify_email(self, token: Optional[str] = None, email: Optional[str] = None, code: Optional[str] = None) -> Dict[str, Any]:
        """Verify an account using either the URL link token or email + 6-digit code."""
        if not token and not (email and code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either a verification token or an email with a 6-digit code is required."
            )

        async with get_db_connection() as conn:
            if token:
                # Link token verification
                t_hash = hash_token(token)
                async with conn.execute(
                    """
                    SELECT id, user_id, attempts, max_attempts, expires_at, used_at
                    FROM auth_tokens
                    WHERE token_type = 'verify_email' AND token_hash = ?
                    """,
                    (t_hash,)
                ) as cursor:
                    token_row = await cursor.fetchone()

                if not token_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid or expired verification link."
                    )

                if token_row["used_at"] is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This verification link has already been used. Please log in."
                    )

                if self._is_expired(token_row["expires_at"]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This verification link has expired. Please request a new verification email."
                    )

                user_id = token_row["user_id"]
                token_id = token_row["id"]

            else:
                # Code verification
                norm_email = email.strip().lower()

                async with conn.execute("SELECT id, is_verified FROM users WHERE email = ?", (norm_email,)) as cursor:
                    user_row = await cursor.fetchone()

                if not user_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid email or verification code."
                    )

                user_id = user_row["id"]

                async with conn.execute(
                    """
                    SELECT id, attempts, max_attempts, expires_at, used_at, token_hash
                    FROM auth_tokens
                    WHERE user_id = ? AND token_type = 'verify_email_code' AND used_at IS NULL
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (user_id,)
                ) as cursor:
                    code_row = await cursor.fetchone()

                if not code_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No active verification code found for this account."
                    )

                if code_row["attempts"] >= code_row["max_attempts"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Maximum verification attempts exceeded. Please request a new verification code."
                    )

                if self._is_expired(code_row["expires_at"]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Verification code has expired. Please request a new code."
                    )

                if not verify_code(code.strip(), code_row["token_hash"]):
                    # Increment failed attempt
                    await conn.execute(
                        "UPDATE auth_tokens SET attempts = attempts + 1 WHERE id = ?",
                        (code_row["id"],)
                    )
                    await conn.commit()
                    remaining = code_row["max_attempts"] - (code_row["attempts"] + 1)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
                    )

                token_id = code_row["id"]

            # Mark token/code as consumed and activate user
            now = self._now_iso()
            await conn.execute("UPDATE auth_tokens SET used_at = ? WHERE id = ?", (now, token_id))
            await conn.execute(
                "UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?",
                (now, user_id)
            )
            # Invalidate any other pending verification tokens for this user
            await conn.execute(
                "UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND token_type LIKE 'verify_email%' AND used_at IS NULL",
                (now, user_id)
            )
            await conn.commit()

        return {
            "status": "success",
            "message": "Email verified successfully! You may now sign in to SuchnaSetu AI."
        }

    async def resend_verification(self, email: str, client_ip: str = "unknown") -> Dict[str, Any]:
        """Resend verification email with throttling."""
        norm_email = email.strip().lower()

        # Stage 2: Rate limit checks
        if not await self.check_rate_limit(f"resend:{norm_email}", 1, 60):
            logger.info(f"[STAGE 2: RATE LIMIT] Resend rejected: 60s cooldown active for recipient={_mask_email(norm_email)}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait at least 60 seconds before requesting another verification email."
            )

        if not await self.check_rate_limit(f"resend_hourly:{norm_email}", 5, 3600):
            logger.warning(f"[STAGE 2: RATE LIMIT] Resend rejected: hourly limit (5/hr) exceeded for recipient={_mask_email(norm_email)}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many resend attempts for this email address. Please try again later."
            )

        logger.info(f"[STAGE 2: RATE LIMIT] Rate limits passed for resend: recipient={_mask_email(norm_email)}")

        async with get_db_connection() as conn:
            # Stage 1: Account lookup
            logger.info(f"[STAGE 1: ACCOUNT LOOKUP] Resend verification lookup for recipient={_mask_email(norm_email)}")
            async with conn.execute(
                "SELECT id, name, is_verified FROM users WHERE email = ?",
                (norm_email,)
            ) as cursor:
                user = await cursor.fetchone()

            if user:
                if user["is_verified"]:
                    logger.info(
                        f"[STAGE 3: VERIFICATION DECISION] User id={user['id'][:8]} ({_mask_email(norm_email)}) is ALREADY VERIFIED. "
                        f"Skipping credential generation and email dispatch."
                    )
                    return {
                        "status": "success",
                        "message": "This account is already verified and active. You can sign in directly with your password.",
                        "email_delivered": False,
                        "already_verified": True
                    }

                # Account exists and is unverified -> proceed with fresh verification dispatch
                logger.info(f"[STAGE 3: VERIFICATION CREDENTIALS] Generating fresh verification credentials for unverified user_id={user['id'][:8]}")
                now = self._now_iso()
                token_expiry = self._expires_iso(hours=settings.AUTH_VERIFY_EXPIRE_HOURS)
                verify_token = generate_secure_token(32)
                verify_code = generate_secure_code(6)

                # Attempt email dispatch FIRST to avoid invalidating existing token on mail failure
                delivery = await email_service.send_verification_email(
                    email=norm_email,
                    name=user["name"],
                    token=verify_token,
                    code=verify_code
                )

                if not delivery.success:
                    logger.warning(f"[STAGE 8: RESPONSE CONSTRUCTION] Resend email delivery failed for user {user['id'][:8]}: {delivery.message}. Preserving existing valid tokens.")
                    return {
                        "status": "warning",
                        "message": "Unable to deliver verification email at this time due to a temporary mail server failure. Your existing verification code remains valid. Please try again later.",
                        "email_delivered": False
                    }

                # Invalidate existing unused tokens only after successful dispatch
                await conn.execute(
                    "UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND token_type LIKE 'verify_email%' AND used_at IS NULL",
                    (now, user["id"])
                )

                # Store new tokens
                await conn.execute(
                    """
                    INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                    VALUES (?, ?, 'verify_email', ?, 5, ?, ?)
                    """,
                    (str(uuid.uuid4()), user["id"], hash_token(verify_token), token_expiry, now)
                )

                await conn.execute(
                    """
                    INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                    VALUES (?, ?, 'verify_email_code', ?, 5, ?, ?)
                    """,
                    (str(uuid.uuid4()), user["id"], hash_code(verify_code), token_expiry, now)
                )
                await conn.commit()

                logger.info(f"[STAGE 8: RESPONSE CONSTRUCTION] Resend verification email accepted by mail relay for user_id={user['id'][:8]}.")
                return {
                    "status": "success",
                    "message": "If an unverified account exists for this email, a new verification link has been sent.",
                    "email_delivered": True
                }

        # User does not exist: consistent response preventing account enumeration
        logger.info(f"[STAGE 1: ACCOUNT LOOKUP] No account found for recipient={_mask_email(norm_email)}. Public response returned.")
        return {
            "status": "success",
            "message": "If an unverified account exists for this email, a new verification link has been sent.",
            "email_delivered": False
        }

    # --------------------------------------------------------------------------
    # Login, Sessions & Logout
    # --------------------------------------------------------------------------
    async def login_user(
        self,
        email: str,
        password: str,
        remember_me: bool = False,
        user_agent: Optional[str] = None,
        client_ip: str = "unknown"
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Authenticate user with Argon2id and create a secure server-managed session.
        Returns: (opaque_session_token, user_public_dict)
        """
        norm_email = email.strip().lower()

        # Rate limit login attempts: 5 failed attempts per 5 minutes per IP
        rate_key = f"login_fail:{client_ip}_{norm_email}"

        async with get_db_connection() as conn:
            async with conn.execute(
                "SELECT id, email, name, password_hash, is_verified, created_at FROM users WHERE email = ?",
                (norm_email,)
            ) as cursor:
                user = await cursor.fetchone()

        if not user or not verify_password(password, user["password_hash"]):
            await self.check_rate_limit(rate_key, 5, 300)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        if not user["is_verified"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account email is not verified. Please check your inbox for the verification link."
            )

        # Session duration: 30 days if remember_me, otherwise 7 days
        expire_hours = 720 if remember_me else settings.AUTH_SESSION_EXPIRE_HOURS
        session_token = generate_secure_token(32)
        token_hash = hash_token(session_token)
        now = self._now_iso()
        expires_at = self._expires_iso(hours=expire_hours)
        session_id = str(uuid.uuid4())

        async with get_db_connection() as conn:
            await conn.execute(
                """
                INSERT INTO sessions (id, user_id, session_token_hash, user_agent, ip_address, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, user["id"], token_hash, user_agent, client_ip, expires_at, now)
            )
            await conn.commit()

        user_public = {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_verified": bool(user["is_verified"]),
            "created_at": user["created_at"]
        }

        return session_token, user_public

    async def get_user_by_session_token(self, raw_session_token: str) -> Optional[Dict[str, Any]]:
        """Resolve a user from an opaque session token."""
        if not raw_session_token or len(raw_session_token.strip()) < 16:
            return None

        token_hash = hash_token(raw_session_token)

        async with get_db_connection() as conn:
            async with conn.execute(
                """
                SELECT s.id as session_id, s.expires_at, u.id, u.email, u.name, u.is_verified, u.created_at
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_token_hash = ?
                """,
                (token_hash,)
            ) as cursor:
                row = await cursor.fetchone()

            if not row:
                return None

            if self._is_expired(row["expires_at"]):
                # Clean up expired session
                await conn.execute("DELETE FROM sessions WHERE id = ?", (row["session_id"],))
                await conn.commit()
                return None

            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "is_verified": bool(row["is_verified"]),
                "created_at": row["created_at"],
                "session_id": row["session_id"]
            }

    async def logout_session(self, raw_session_token: str) -> bool:
        """Invalidate a server session."""
        if not raw_session_token:
            return False

        token_hash = hash_token(raw_session_token)
        async with get_db_connection() as conn:
            await conn.execute("DELETE FROM sessions WHERE session_token_hash = ?", (token_hash,))
            await conn.commit()
        return True

    # --------------------------------------------------------------------------
    # Password Recovery (Forgot Password & Reset)
    # --------------------------------------------------------------------------
    async def request_password_reset(self, email: str, method: str = "link", client_ip: str = "unknown") -> Dict[str, Any]:
        """Initiate password recovery using either a reset link or a 6-digit recovery code."""
        norm_email = email.strip().lower()

        # Rate limit: max 3 requests per 10 minutes per email/IP
        if not await self.check_rate_limit(f"pwd_reset:{norm_email}", 3, 600):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many password reset requests. Please wait a few minutes before trying again."
            )

        async with get_db_connection() as conn:
            async with conn.execute("SELECT id, name FROM users WHERE email = ?", (norm_email,)) as cursor:
                user = await cursor.fetchone()

            if user:
                user_id = user["id"]
                name = user["name"]
                now = self._now_iso()
                token_expiry = self._expires_iso(minutes=settings.AUTH_TOKEN_EXPIRE_MINUTES)

                # Invalidate existing unused reset tokens for this user
                await conn.execute(
                    "UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND token_type LIKE 'reset_%' AND used_at IS NULL",
                    (now, user_id)
                )

                if method == "code":
                    code = generate_secure_code(6)
                    await conn.execute(
                        """
                        INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                        VALUES (?, ?, 'reset_code', ?, 5, ?, ?)
                        """,
                        (str(uuid.uuid4()), user_id, hash_code(code), token_expiry, now)
                    )
                    await conn.commit()
                    await email_service.send_password_reset_code(norm_email, name, code)
                else:
                    token = generate_secure_token(32)
                    await conn.execute(
                        """
                        INSERT INTO auth_tokens (id, user_id, token_type, token_hash, max_attempts, expires_at, created_at)
                        VALUES (?, ?, 'reset_link', ?, 5, ?, ?)
                        """,
                        (str(uuid.uuid4()), user_id, hash_token(token), token_expiry, now)
                    )
                    await conn.commit()
                    await email_service.send_password_reset_link(norm_email, name, token)

        # Generic response to prevent account enumeration
        return {
            "status": "success",
            "message": "If an account exists for this email address, instructions to reset your password will be sent shortly."
        }

    async def reset_password(
        self,
        new_password: str,
        token: Optional[str] = None,
        email: Optional[str] = None,
        code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Validate reset link token or 6-digit code and update account password."""
        if not token and not (email and code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either a reset token or an email with a 6-digit code is required."
            )

        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long."
            )
        if len(new_password) > 128:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password cannot exceed 128 characters."
            )

        async with get_db_connection() as conn:
            if token:
                # Link reset
                t_hash = hash_token(token)
                async with conn.execute(
                    """
                    SELECT id, user_id, attempts, max_attempts, expires_at, used_at
                    FROM auth_tokens
                    WHERE token_type = 'reset_link' AND token_hash = ?
                    """,
                    (t_hash,)
                ) as cursor:
                    token_row = await cursor.fetchone()

                if not token_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid or expired password reset link."
                    )

                if token_row["used_at"] is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This password reset link has already been used. Please request a new one."
                    )

                if self._is_expired(token_row["expires_at"]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This password reset link has expired. Please request a new one."
                    )

                user_id = token_row["user_id"]
                token_id = token_row["id"]

            else:
                # Code reset
                norm_email = email.strip().lower()

                async with conn.execute("SELECT id FROM users WHERE email = ?", (norm_email,)) as cursor:
                    user_row = await cursor.fetchone()

                if not user_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid email or recovery code."
                    )

                user_id = user_row["id"]

                async with conn.execute(
                    """
                    SELECT id, attempts, max_attempts, expires_at, used_at, token_hash
                    FROM auth_tokens
                    WHERE user_id = ? AND token_type = 'reset_code' AND used_at IS NULL
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (user_id,)
                ) as cursor:
                    code_row = await cursor.fetchone()

                if not code_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No active recovery code found for this account."
                    )

                if code_row["attempts"] >= code_row["max_attempts"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Maximum recovery attempts exceeded. Please request a new recovery code."
                    )

                if self._is_expired(code_row["expires_at"]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Recovery code has expired. Please request a new code."
                    )

                if not verify_code(code.strip(), code_row["token_hash"]):
                    await conn.execute(
                        "UPDATE auth_tokens SET attempts = attempts + 1 WHERE id = ?",
                        (code_row["id"],)
                    )
                    await conn.commit()
                    remaining = code_row["max_attempts"] - (code_row["attempts"] + 1)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Incorrect recovery code. {remaining} attempt(s) remaining."
                    )

                token_id = code_row["id"]

            # Update password with Argon2id hash
            now = self._now_iso()
            new_hash = hash_password(new_password)
            await conn.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (new_hash, now, user_id)
            )

            # Mark token as consumed
            await conn.execute("UPDATE auth_tokens SET used_at = ? WHERE id = ?", (now, token_id))

            # Invalidate all other pending recovery tokens for this user
            await conn.execute(
                "UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND token_type LIKE 'reset_%' AND used_at IS NULL",
                (now, user_id)
            )

            # Revoke all existing sessions for this user (security requirement)
            await conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

            # Fetch user email & name for notification
            async with conn.execute("SELECT email, name FROM users WHERE id = ?", (user_id,)) as cursor:
                user_info = await cursor.fetchone()

            await conn.commit()

        if user_info:
            await email_service.send_password_changed_notification(user_info["email"], user_info["name"])

        return {
            "status": "success",
            "message": "Password reset successfully. All existing sessions have been signed out. You may now log in with your new password."
        }

auth_service = AuthService()

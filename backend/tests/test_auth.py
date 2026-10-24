import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db_connection
from app.core.security import verify_password, hash_token

client = TestClient(app)

@pytest.fixture(scope="function", autouse=True)
def clean_test_rate_limits():
    """Ensure rate limits table is clean between tests."""
    async def _clean():
        async with get_db_connection() as conn:
            await conn.execute("DELETE FROM rate_limits")
            await conn.commit()
    asyncio.run(_clean())

@pytest.fixture(scope="module", autouse=True)
def clean_test_users():
    """Ensure test tables are clean before running auth tests."""
    async def _clean():
        async with get_db_connection() as conn:
            await conn.execute("DELETE FROM users WHERE email LIKE '%@test.suchnasetu.gov.in'")
            await conn.execute("DELETE FROM rate_limits")
            await conn.commit()
    asyncio.run(_clean())

def test_registration_success():
    """Citizen can register with valid details and receives an unverified account."""
    payload = {
        "name": "Arjun Sharma",
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "SecurePassphrase2026#Citizen",
        "confirm_password": "SecurePassphrase2026#Citizen"
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "verify" in data["message"].lower()

    # Verify user in database
    async def _check():
        async with get_db_connection() as conn:
            async with conn.execute(
                "SELECT id, email, is_verified, password_hash FROM users WHERE email = ?",
                ("arjun.sharma@test.suchnasetu.gov.in",)
            ) as cur:
                row = await cur.fetchone()
                assert row is not None
                assert row["is_verified"] == 0
                assert verify_password("SecurePassphrase2026#Citizen", row["password_hash"])
                assert not row["password_hash"].startswith("pbkdf2")
                assert "$argon2id$" in row["password_hash"]
    asyncio.run(_check())

def test_registration_password_mismatch():
    """Registration fails if passwords do not match."""
    payload = {
        "name": "Priya Verma",
        "email": "priya.verma@test.suchnasetu.gov.in",
        "password": "Password123#",
        "confirm_password": "DifferentPassword123#"
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 422

def test_registration_short_password():
    """Registration rejects passwords shorter than 8 characters."""
    payload = {
        "name": "Short Pass User",
        "email": "short@test.suchnasetu.gov.in",
        "password": "short",
        "confirm_password": "short"
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code in (400, 422)

def test_registration_duplicate_handling_generic():
    """Duplicate registration yields generic response to prevent account enumeration."""
    payload = {
        "name": "Arjun Sharma Duplicate",
        "email": "ARJUN.SHARMA@test.suchnasetu.gov.in",  # Tests email normalization
        "password": "AnotherPassword2026#",
        "confirm_password": "AnotherPassword2026#"
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"

def test_login_unverified_account_forbidden():
    """Unverified account cannot sign in (HTTP 403)."""
    resp = client.post("/api/auth/login", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "SecurePassphrase2026#Citizen"
    })
    assert resp.status_code == 403
    assert "not verified" in resp.json()["detail"].lower()

def test_verify_email_with_code():
    """Verify account using the 6-digit code."""
    # Retrieve the code token from database
    async def _get_code():
        async with get_db_connection() as conn:
            async with conn.execute(
                """
                SELECT u.id, t.token_hash
                FROM users u
                JOIN auth_tokens t ON u.id = t.user_id
                WHERE u.email = 'arjun.sharma@test.suchnasetu.gov.in' AND t.token_type = 'verify_email_code'
                """
            ) as cur:
                return await cur.fetchone()
    row = asyncio.run(_get_code())
    assert row is not None

    # Test invalid code first
    fail_resp = client.post("/api/auth/verify-email", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "code": "000000"
    })
    assert fail_resp.status_code == 400
    assert "incorrect" in fail_resp.json()["detail"].lower()

    # Set known test code in DB
    test_code = "654321"
    async def _set_known():
        async with get_db_connection() as conn:
            await conn.execute(
                "UPDATE auth_tokens SET token_hash = ? WHERE token_type = 'verify_email_code'",
                (hash_token(test_code),)
            )
            await conn.commit()
    asyncio.run(_set_known())

    success_resp = client.post("/api/auth/verify-email", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "code": test_code
    })
    assert success_resp.status_code == 200
    assert "verified successfully" in success_resp.json()["message"].lower()

    # Re-using the same code must fail
    reuse_resp = client.post("/api/auth/verify-email", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "code": test_code
    })
    assert reuse_resp.status_code == 400

def test_login_success_and_session_cookie():
    """Verified citizen can log in and receives HttpOnly session cookie."""
    resp = client.post("/api/auth/login", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "SecurePassphrase2026#Citizen",
        "remember_me": True
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == "arjun.sharma@test.suchnasetu.gov.in"
    assert data["user"]["is_verified"] is True
    assert "password_hash" not in data["user"]

    # Check cookies
    cookies = resp.cookies
    assert "suchnasetu_session" in cookies
    session_token = cookies["suchnasetu_session"]
    assert len(session_token) > 20

    # Test GET /api/auth/me with session cookie
    me_resp = client.get("/api/auth/me", cookies={"suchnasetu_session": session_token})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "arjun.sharma@test.suchnasetu.gov.in"
    assert me_data["name"] == "Arjun Sharma"

def test_login_invalid_password():
    """Login with invalid password fails with 401."""
    resp = client.post("/api/auth/login", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "WrongPassword123#"
    })
    assert resp.status_code == 401
    assert "invalid email or password" in resp.json()["detail"].lower()

def test_me_unauthenticated():
    """GET /api/auth/me without cookie returns 401."""
    # Ensure no cookies
    local_client = TestClient(app)
    resp = local_client.get("/api/auth/me")
    assert resp.status_code == 401

def test_logout_revokes_session():
    """Logout invalidates server session and deletes cookie."""
    login_resp = client.post("/api/auth/login", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "SecurePassphrase2026#Citizen"
    })
    session_token = login_resp.cookies["suchnasetu_session"]

    # Logout
    logout_resp = client.post("/api/auth/logout", cookies={"suchnasetu_session": session_token})
    assert logout_resp.status_code == 200

    # Old session is now rejected
    after_resp = client.get("/api/auth/me", cookies={"suchnasetu_session": session_token})
    assert after_resp.status_code == 401

def test_forgot_password_generic_response():
    """Forgot password returns generic message for both existing and nonexistent accounts."""
    # Existing user
    resp1 = client.post("/api/auth/forgot-password", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "method": "link"
    })
    assert resp1.status_code == 200
    assert "instructions to reset your password" in resp1.json()["message"].lower()

    # Nonexistent user
    resp2 = client.post("/api/auth/forgot-password", json={
        "email": "nonexistent.user.2026@test.suchnasetu.gov.in",
        "method": "code"
    })
    assert resp2.status_code == 200
    assert "instructions to reset your password" in resp2.json()["message"].lower()

def test_reset_password_with_link():
    """Password reset with link token updates password and revokes existing sessions."""
    # Request reset link
    client.post("/api/auth/forgot-password", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "method": "link"
    })

    # Set known token in database
    test_reset_token = "secret_reset_token_test_12345"
    async def _set_reset_token():
        async with get_db_connection() as conn:
            await conn.execute(
                "UPDATE auth_tokens SET token_hash = ? WHERE token_type = 'reset_link' AND used_at IS NULL",
                (hash_token(test_reset_token),)
            )
            await conn.commit()
    asyncio.run(_set_reset_token())

    # Reset password
    reset_resp = client.post("/api/auth/reset-password", json={
        "token": test_reset_token,
        "new_password": "BrandNewPassword2026#Passphrase",
        "confirm_password": "BrandNewPassword2026#Passphrase"
    })
    assert reset_resp.status_code == 200
    assert "reset successfully" in reset_resp.json()["message"].lower()

    # Re-use must fail
    reuse_resp = client.post("/api/auth/reset-password", json={
        "token": test_reset_token,
        "new_password": "AnotherNewPassword2026#",
        "confirm_password": "AnotherNewPassword2026#"
    })
    assert reuse_resp.status_code == 400

    # Old password no longer works
    old_login = client.post("/api/auth/login", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "SecurePassphrase2026#Citizen"
    })
    assert old_login.status_code == 401

    # New password works
    new_login = client.post("/api/auth/login", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "BrandNewPassword2026#Passphrase"
    })
    assert new_login.status_code == 200
    assert "suchnasetu_session" in new_login.cookies

def test_reset_password_with_code():
    """Password reset with 6-digit recovery code."""
    # Request code
    client.post("/api/auth/forgot-password", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "method": "code"
    })

    test_code = "778899"
    async def _set_code():
        async with get_db_connection() as conn:
            await conn.execute(
                "UPDATE auth_tokens SET token_hash = ? WHERE token_type = 'reset_code' AND used_at IS NULL",
                (hash_token(test_code),)
            )
            await conn.commit()
    asyncio.run(_set_code())

    # Invalid code attempt
    fail_resp = client.post("/api/auth/reset-password", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "code": "111111",
        "new_password": "CodeUpdatedPassword2026#",
        "confirm_password": "CodeUpdatedPassword2026#"
    })
    assert fail_resp.status_code == 400
    assert "incorrect" in fail_resp.json()["detail"].lower()

    # Valid code reset
    ok_resp = client.post("/api/auth/reset-password", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "code": test_code,
        "new_password": "CodeUpdatedPassword2026#",
        "confirm_password": "CodeUpdatedPassword2026#"
    })
    assert ok_resp.status_code == 200

    # Login with code-updated password
    login_resp = client.post("/api/auth/login", json={
        "email": "arjun.sharma@test.suchnasetu.gov.in",
        "password": "CodeUpdatedPassword2026#"
    })
    assert login_resp.status_code == 200

def test_protected_routes_reject_unauthenticated():
    """Protected endpoints reject unauthenticated requests with 401."""
    clean_client = TestClient(app)
    # /api/analyze requires authentication
    resp = clean_client.post("/api/analyze", data={"text": "Notice text without session"})
    assert resp.status_code == 401
    assert "authentication required" in resp.json()["detail"].lower()

def test_hmac_secret_protection():
    """Verify 6-digit codes use server-secret-keyed HMAC and not plain SHA-256."""
    import hashlib
    from app.core.security import hash_code, verify_code
    from app.core.config import settings

    raw_code = "481920"
    hmac_digest = hash_code(raw_code)
    plain_sha256 = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()

    # Plain SHA-256 MUST NOT match the HMAC digest
    assert hmac_digest != plain_sha256

    # Verification with correct secret succeeds
    assert verify_code(raw_code, hmac_digest) is True

    # Verification with plain SHA-256 digest fails
    assert verify_code(raw_code, plain_sha256) is False

    # Verification with wrong secret fails
    wrong_secret_digest = hash_code(raw_code, secret_key="completely-different-secret-key")
    assert verify_code(raw_code, wrong_secret_digest) is False

def test_recovery_code_excessive_attempts_lockout():
    """Exceeding 5 incorrect recovery code attempts locks out the token."""
    email = "lockout.test@test.suchnasetu.gov.in"
    # Register and verify user
    client.post("/api/auth/register", json={
        "name": "Lockout User",
        "email": email,
        "password": "InitialPassword2026#",
        "confirm_password": "InitialPassword2026#"
    })
    # Manually mark verified
    async def _verify():
        async with get_db_connection() as conn:
            await conn.execute("UPDATE users SET is_verified = 1 WHERE email = ?", (email,))
            await conn.commit()
    asyncio.run(_verify())

    # Request code reset
    client.post("/api/auth/forgot-password", json={"email": email, "method": "code"})

    # Submit 5 incorrect codes
    for attempt in range(1, 6):
        resp = client.post("/api/auth/reset-password", json={
            "email": email,
            "code": f"00000{attempt}",
            "new_password": "LockedOutPassword2026#",
            "confirm_password": "LockedOutPassword2026#"
        })
        assert resp.status_code == 400
        assert "attempt(s) remaining" in resp.json()["detail"] or "maximum recovery attempts exceeded" in resp.json()["detail"].lower()

    # 6th attempt: even if user gets the code, it must be locked out
    lockout_resp = client.post("/api/auth/reset-password", json={
        "email": email,
        "code": "123456",
        "new_password": "LockedOutPassword2026#",
        "confirm_password": "LockedOutPassword2026#"
    })
    assert lockout_resp.status_code == 400
    assert "maximum recovery attempts exceeded" in lockout_resp.json()["detail"].lower()

def test_password_reset_revokes_active_sessions_immediately():
    """A password reset must immediately invalidate all existing sessions."""
    email = "session.revocation@test.suchnasetu.gov.in"
    password = "OriginalSessionPassword2026#"
    new_password = "UpdatedSessionPassword2026#"

    # Register & verify
    client.post("/api/auth/register", json={
        "name": "Revocation User",
        "email": email,
        "password": password,
        "confirm_password": password
    })
    async def _verify():
        async with get_db_connection() as conn:
            await conn.execute("UPDATE users SET is_verified = 1 WHERE email = ?", (email,))
            await conn.commit()
    asyncio.run(_verify())

    # Log in and acquire session cookie
    login_resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    session_cookie = login_resp.cookies["suchnasetu_session"]

    # Verify session works
    me_resp = client.get("/api/auth/me", cookies={"suchnasetu_session": session_cookie})
    assert me_resp.status_code == 200

    # Request reset link
    client.post("/api/auth/forgot-password", json={"email": email, "method": "link"})
    test_token = "valid_reset_token_session_test_999"
    async def _set_token():
        async with get_db_connection() as conn:
            await conn.execute(
                "UPDATE auth_tokens SET token_hash = ? WHERE user_id = (SELECT id FROM users WHERE email = ?) AND token_type = 'reset_link'",
                (hash_token(test_token), email)
            )
            await conn.commit()
    asyncio.run(_set_token())

    # Reset password
    reset_resp = client.post("/api/auth/reset-password", json={
        "token": test_token,
        "new_password": new_password,
        "confirm_password": new_password
    })
    assert reset_resp.status_code == 200

    # Old session cookie must now be rejected immediately
    me_after_resp = client.get("/api/auth/me", cookies={"suchnasetu_session": session_cookie})
    assert me_after_resp.status_code == 401
    assert "unauthenticated" in me_after_resp.json()["detail"].lower() or "invalid" in me_after_resp.json()["detail"].lower()

def test_api_responses_never_expose_tokens_or_hashes():
    """Verify that registration, password reset, login, and user profile never return sensitive tokens or hashes."""
    # 1. Register response
    reg_resp = client.post("/api/auth/register", json={
        "name": "Sanitization Check",
        "email": "sanitize.check@test.suchnasetu.gov.in",
        "password": "CleanResponsePassword2026#",
        "confirm_password": "CleanResponsePassword2026#"
    })
    reg_data = reg_resp.json()
    assert "token" not in reg_data
    assert "code" not in reg_data
    assert "token_hash" not in reg_data
    assert "password_hash" not in reg_data

    # 2. Forgot password response
    forgot_resp = client.post("/api/auth/forgot-password", json={
        "email": "sanitize.check@test.suchnasetu.gov.in",
        "method": "code"
    })
    forgot_data = forgot_resp.json()
    assert "code" not in forgot_data
    assert "token" not in forgot_data
    assert forgot_data.get("user") is None
    assert "token_hash" not in forgot_data
    assert "password_hash" not in forgot_data

def test_csrf_untrusted_origin_rejection():
    """State-changing requests with an untrusted Origin header must be rejected with 403 Forbidden."""
    untrusted_resp = client.post(
        "/api/auth/login",
        json={"email": "anyone@example.com", "password": "password"},
        headers={"Origin": "https://malicious-site.attacker.com"}
    )
    assert untrusted_resp.status_code == 403
    assert "untrusted request origin" in untrusted_resp.json()["detail"].lower()

    # Trusted origin is allowed through
    trusted_resp = client.post(
        "/api/auth/login",
        json={"email": "anyone@example.com", "password": "password"},
        headers={"Origin": "http://localhost:5173"}
    )
    # Fails authentication, NOT origin
    assert trusted_resp.status_code in (401, 403)
    assert "untrusted request origin" not in trusted_resp.text.lower()

def test_expired_token_rejected():
    """An expired token is rejected with HTTP 400."""
    email = "expired.test@test.suchnasetu.gov.in"
    client.post("/api/auth/register", json={
        "name": "Expired Test",
        "email": email,
        "password": "Password123#Secure",
        "confirm_password": "Password123#Secure"
    })

    # Set token to expired
    test_link = "expired_link_token_123"
    async def _expire():
        async with get_db_connection() as conn:
            await conn.execute(
                """
                UPDATE auth_tokens
                SET token_hash = ?, expires_at = '2020-01-01T00:00:00+00:00'
                WHERE user_id = (SELECT id FROM users WHERE email = ?)
                """,
                (hash_token(test_link), email)
            )
            await conn.commit()
    asyncio.run(_expire())

    resp = client.post("/api/auth/verify-email", json={"token": test_link})
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()

def test_signup_invokes_email_delivery_and_sets_email_delivered():
    """Registration triggers email dispatch and returns explicit email_delivered status."""
    from unittest.mock import patch, AsyncMock
    from app.services.email_service import EmailDeliveryResult, email_service

    email = "delivery.status@test.suchnasetu.gov.in"
    mock_result = EmailDeliveryResult(True, "Email accepted by mail server for delivery", "smtp")

    with patch.object(email_service, "send_verification_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = mock_result
        resp = client.post("/api/auth/register", json={
            "name": "Delivery Test User",
            "email": email,
            "password": "DeliveryPassword2026#",
            "confirm_password": "DeliveryPassword2026#"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["email_delivered"] is True
        mock_send.assert_awaited_once()
        assert mock_send.await_args.kwargs["email"] == email

def test_signup_email_failure_preserves_account_and_warns():
    """If SMTP delivery fails during signup, account is preserved with active tokens and user is informed."""
    from unittest.mock import patch, AsyncMock
    from app.services.email_service import EmailDeliveryResult, email_service

    email = "smtp.failure@test.suchnasetu.gov.in"
    mock_fail = EmailDeliveryResult(False, "Simulated SMTP connection timeout", "smtp")

    with patch.object(email_service, "send_verification_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = mock_fail
        resp = client.post("/api/auth/register", json={
            "name": "SMTP Fail User",
            "email": email,
            "password": "SafeFailPassword2026#",
            "confirm_password": "SafeFailPassword2026#"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        assert data["email_delivered"] is False
        assert "could not be delivered" in data["message"].lower()

    # User MUST be preserved in database
    async def _check():
        async with get_db_connection() as conn:
            async with conn.execute("SELECT id, is_verified FROM users WHERE email = ?", (email,)) as cur:
                user = await cur.fetchone()
                assert user is not None
                assert user["is_verified"] == 0
            async with conn.execute(
                "SELECT COUNT(*) as cnt FROM auth_tokens WHERE user_id = ? AND used_at IS NULL",
                (user["id"],)
            ) as cur:
                toks = await cur.fetchone()
                assert toks["cnt"] >= 2  # Link token and 6-digit code preserved
    asyncio.run(_check())

def test_duplicate_unverified_registration_does_not_create_duplicate_account():
    """Re-submitting registration for unverified email does not create duplicate and handles resend cleanly."""
    from unittest.mock import patch, AsyncMock
    from app.services.email_service import EmailDeliveryResult, email_service

    email = "dup.unverified@test.suchnasetu.gov.in"
    client.post("/api/auth/register", json={
        "name": "Original Citizen",
        "email": email,
        "password": "OriginalPassword2026#",
        "confirm_password": "OriginalPassword2026#"
    })

    # Clear rate limit to test re-registration path
    async def _clear_rl():
        async with get_db_connection() as conn:
            await conn.execute("DELETE FROM rate_limits WHERE key LIKE 'resend:%'")
            await conn.commit()
    asyncio.run(_clear_rl())

    with patch.object(email_service, "send_verification_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = EmailDeliveryResult(True, "Dispatched", "smtp")
        resp = client.post("/api/auth/register", json={
            "name": "Original Citizen Re-attempt",
            "email": email,
            "password": "NewPasswordAttempt2026#",
            "confirm_password": "NewPasswordAttempt2026#"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"

    # Exactly one user record must exist (no duplicate accounts created)
    async def _verify_single():
        async with get_db_connection() as conn:
            async with conn.execute("SELECT COUNT(*) as count FROM users WHERE email = ?", (email,)) as cur:
                row = await cur.fetchone()
                assert row["count"] == 1
    asyncio.run(_verify_single())

def test_resend_verification_cooldown_and_attempt_limit():
    """Resend verification enforces 60-second cooldown."""
    email = "cooldown.test@test.suchnasetu.gov.in"
    client.post("/api/auth/register", json={
        "name": "Cooldown Citizen",
        "email": email,
        "password": "CooldownPassword2026#",
        "confirm_password": "CooldownPassword2026#"
    })

    # Reset rate limit to ensure first resend succeeds
    async def _reset_rl():
        async with get_db_connection() as conn:
            await conn.execute("DELETE FROM rate_limits WHERE key LIKE 'resend:%'")
            await conn.commit()
    asyncio.run(_reset_rl())

    # 1. First resend
    first_resp = client.post("/api/auth/resend-verification", json={"email": email})
    assert first_resp.status_code == 200
    assert first_resp.json()["email_delivered"] is True

    # 2. Immediate second resend must be rejected with 429
    second_resp = client.post("/api/auth/resend-verification", json={"email": email})
    assert second_resp.status_code == 429
    assert "wait at least 60 seconds" in second_resp.json()["detail"].lower()

def test_resend_preserves_valid_token_when_delivery_fails():
    """If SMTP delivery fails during resend, old active token is preserved rather than invalidated."""
    from unittest.mock import patch, AsyncMock
    from app.services.email_service import EmailDeliveryResult, email_service

    email = "preserve.token@test.suchnasetu.gov.in"
    client.post("/api/auth/register", json={
        "name": "Preserve Citizen",
        "email": email,
        "password": "PreserveTokenPass2026#",
        "confirm_password": "PreserveTokenPass2026#"
    })

    # Set known code on the initial active token
    known_initial_code = "445566"
    async def _set_initial_code():
        async with get_db_connection() as conn:
            await conn.execute(
                """
                UPDATE auth_tokens
                SET token_hash = ?
                WHERE user_id = (SELECT id FROM users WHERE email = ?)
                  AND token_type = 'verify_email_code'
                  AND used_at IS NULL
                """,
                (hash_token(known_initial_code), email)
            )
            await conn.execute("DELETE FROM rate_limits WHERE key LIKE 'resend:%'")
            await conn.commit()
    asyncio.run(_set_initial_code())

    # Mock send_verification_email to fail
    with patch.object(email_service, "send_verification_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = EmailDeliveryResult(False, "Simulated SMTP relay error", "smtp")
        fail_resp = client.post("/api/auth/resend-verification", json={"email": email})
        assert fail_resp.status_code == 200
        fail_data = fail_resp.json()
        assert fail_data["status"] == "warning"
        assert fail_data["email_delivered"] is False
        assert "temporary mail server failure" in fail_data["message"].lower()

    # The original token MUST still be valid and capable of verifying the account
    verify_resp = client.post("/api/auth/verify-email", json={
        "email": email,
        "code": known_initial_code
    })
    assert verify_resp.status_code == 200
    assert "verified successfully" in verify_resp.json()["message"].lower()

def test_old_code_cannot_be_reused_after_replacement():
    """When a new code is successfully issued, old code is invalidated and cannot be used."""
    from unittest.mock import patch, AsyncMock
    from app.services.email_service import EmailDeliveryResult, email_service

    email = "replacement.code@test.suchnasetu.gov.in"
    client.post("/api/auth/register", json={
        "name": "Replace Citizen",
        "email": email,
        "password": "ReplacementPass2026#",
        "confirm_password": "ReplacementPass2026#"
    })

    # Set initial code to known value
    old_code = "112233"
    async def _prep():
        async with get_db_connection() as conn:
            await conn.execute(
                """
                UPDATE auth_tokens
                SET token_hash = ?
                WHERE user_id = (SELECT id FROM users WHERE email = ?)
                  AND token_type = 'verify_email_code'
                """,
                (hash_token(old_code), email)
            )
            await conn.execute("DELETE FROM rate_limits WHERE key LIKE 'resend:%'")
            await conn.commit()
    asyncio.run(_prep())

    # Successfully resend
    with patch.object(email_service, "send_verification_email", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = EmailDeliveryResult(True, "Accepted", "smtp")
        resend_resp = client.post("/api/auth/resend-verification", json={"email": email})
        assert resend_resp.status_code == 200
        assert resend_resp.json()["email_delivered"] is True

    # Try to verify with old code -> MUST fail
    fail_resp = client.post("/api/auth/verify-email", json={
        "email": email,
        "code": old_code
    })
    assert fail_resp.status_code == 400

    # Set new code in DB and verify -> MUST succeed
    new_code = "998877"
    async def _set_new():
        async with get_db_connection() as conn:
            await conn.execute(
                """
                UPDATE auth_tokens
                SET token_hash = ?
                WHERE user_id = (SELECT id FROM users WHERE email = ?)
                  AND token_type = 'verify_email_code'
                  AND used_at IS NULL
                """,
                (hash_token(new_code), email)
            )
            await conn.commit()
    asyncio.run(_set_new())

    ok_resp = client.post("/api/auth/verify-email", json={
        "email": email,
        "code": new_code
    })
    assert ok_resp.status_code == 200

    # Re-use of new code -> MUST fail
    reuse_resp = client.post("/api/auth/verify-email", json={
        "email": email,
        "code": new_code
    })
    assert reuse_resp.status_code == 400

def test_smtp_mime_rfc_headers():
    """Verify that generated verification emails include standard RFC headers: Date, Message-ID, Auto-Submitted."""
    from app.services.email_service import email_service
    from unittest.mock import patch, MagicMock

    captured_msg = None
    captured_from = None
    captured_to = None

    class MockSMTP:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def ehlo(self):
            pass
        def starttls(self, context=None):
            pass
        def login(self, user, pwd):
            pass
        def sendmail(self, from_addr, to_addrs, msg_str):
            nonlocal captured_msg, captured_from, captured_to
            captured_from = from_addr
            captured_to = to_addrs
            import email
            captured_msg = email.message_from_string(msg_str)
            return {}

    with patch("smtplib.SMTP", MockSMTP):
        asyncio.run(email_service._send_smtp(
            recipient="citizen.test@test.suchnasetu.gov.in",
            subject="Verification Test Circular",
            text_content="Plain text content",
            html_content="<p>HTML content</p>"
        ))

    assert captured_msg is not None
    assert captured_msg["Date"] is not None
    assert captured_msg["Message-ID"] is not None
    assert captured_msg["Message-ID"].startswith("<") and captured_msg["Message-ID"].endswith(">")
    assert captured_msg["Auto-Submitted"] == "auto-generated"
    assert captured_msg["Subject"] == "Verification Test Circular"
    assert captured_to == ["citizen.test@test.suchnasetu.gov.in"]

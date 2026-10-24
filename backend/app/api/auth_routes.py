import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Response, HTTPException, status, Depends
from app.core.config import settings
from app.schemas.auth import (
    RegisterRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserPublic,
    AuthResponse,
)
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _extract_session_token(request: Request) -> Optional[str]:
    """Extract session token from cookie, Authorization header, or X-Session-Token."""
    cookie_token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if cookie_token:
        return cookie_token

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    x_session = request.headers.get("X-Session-Token")
    if x_session:
        return x_session.strip()

    return None

async def get_current_user(request: Request) -> Dict[str, Any]:
    """Dependency enforcing that the request is authenticated with a valid session."""
    token = _extract_session_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this workspace."
        )

    user = await auth_service.get_user_by_session_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please sign in again."
        )

    return user

async def get_optional_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Dependency that returns the authenticated user if present, or None if guest."""
    token = _extract_session_token(request)
    if not token:
        return None
    return await auth_service.get_user_by_session_token(token)

# -----------------------------------------------------------------------------
# Auth Endpoints
# -----------------------------------------------------------------------------

@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, request: Request):
    """Register a new citizen account and dispatch an email verification message."""
    client_ip = request.client.host if request.client else "unknown"
    res = await auth_service.register_user(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        client_ip=client_ip
    )
    return AuthResponse(
        status=res["status"],
        message=res["message"],
        email_delivered=res.get("email_delivered"),
        already_verified=res.get("already_verified")
    )

@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(payload: VerifyEmailRequest):
    """Verify an email address using either an email link token or a 6-digit code."""
    res = await auth_service.verify_email(
        token=payload.token,
        email=payload.email,
        code=payload.code
    )
    return AuthResponse(status=res["status"], message=res["message"])

@router.post("/resend-verification", response_model=AuthResponse)
async def resend_verification(payload: ResendVerificationRequest, request: Request):
    """Request a fresh verification link and code if account remains unverified."""
    client_ip = request.client.host if request.client else "unknown"
    res = await auth_service.resend_verification(payload.email, client_ip=client_ip)
    return AuthResponse(
        status=res["status"],
        message=res["message"],
        email_delivered=res.get("email_delivered"),
        already_verified=res.get("already_verified")
    )

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, response: Response):
    """Authenticate with Argon2id and set an HttpOnly session cookie."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "Unknown")

    session_token, user_public = await auth_service.login_user(
        email=payload.email,
        password=payload.password,
        remember_me=payload.remember_me,
        user_agent=user_agent,
        client_ip=client_ip
    )

    # Set secure HttpOnly cookie
    max_age_seconds = (720 if payload.remember_me else settings.AUTH_SESSION_EXPIRE_HOURS) * 3600
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=session_token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/"
    )

    return AuthResponse(
        status="success",
        message="Sign in successful",
        user=UserPublic(**user_public)
    )

@router.post("/logout", response_model=AuthResponse)
async def logout(request: Request, response: Response):
    """Invalidate the current server session and delete the HttpOnly session cookie."""
    token = _extract_session_token(request)
    if token:
        await auth_service.logout_session(token)

    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        secure=settings.AUTH_COOKIE_SECURE,
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE
    )

    return AuthResponse(status="success", message="Successfully logged out.")

@router.get("/me", response_model=UserPublic)
async def get_current_account(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Return the authenticated user's safe public profile."""
    return UserPublic(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        is_verified=current_user["is_verified"],
        created_at=current_user["created_at"]
    )

@router.post("/forgot-password", response_model=AuthResponse)
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """Send a password reset link or 6-digit recovery code."""
    client_ip = request.client.host if request.client else "unknown"
    res = await auth_service.request_password_reset(
        email=payload.email,
        method=payload.method,
        client_ip=client_ip
    )
    return AuthResponse(status=res["status"], message=res["message"])

@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(payload: ResetPasswordRequest):
    """Verify recovery token or code, set a new Argon2id password, and revoke previous sessions."""
    res = await auth_service.reset_password(
        new_password=payload.new_password,
        token=payload.token,
        email=payload.email,
        code=payload.code
    )
    return AuthResponse(status=res["status"], message=res["message"])

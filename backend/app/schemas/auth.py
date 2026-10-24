from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Citizen's full name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Account password (min 8 characters)")
    confirm_password: Optional[str] = Field(None, description="Password confirmation")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters")
        return cleaned

    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, v: Optional[str], values) -> Optional[str]:
        if v is not None and "password" in values.data and v != values.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class VerifyEmailRequest(BaseModel):
    token: Optional[str] = Field(None, description="Verification token from URL link")
    email: Optional[str] = Field(None, description="Registered email if using 6-digit code")
    code: Optional[str] = Field(None, min_length=6, max_length=6, description="6-digit verification code")

class ResendVerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")
    remember_me: bool = Field(False, description="Persist session across browser sessions")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Account email address")
    method: str = Field("link", pattern="^(link|code)$", description="Recovery method: 'link' or 'code'")

class ResetPasswordRequest(BaseModel):
    token: Optional[str] = Field(None, description="Reset token from URL link")
    email: Optional[str] = Field(None, description="Account email if using code recovery")
    code: Optional[str] = Field(None, min_length=6, max_length=6, description="6-digit recovery code")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: Optional[str] = Field(None, description="Confirm new password")

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm(cls, v: Optional[str], values) -> Optional[str]:
        if v is not None and "new_password" in values.data and v != values.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v

class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    is_verified: bool
    created_at: str

class AuthResponse(BaseModel):
    status: str
    message: str
    user: Optional[UserPublic] = None
    email_delivered: Optional[bool] = None
    already_verified: Optional[bool] = None

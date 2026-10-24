from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "SuchnaSetu AI"
    HINDI_NAME: str = "सूचना + सेतु"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Gemma 4 & Inference Model Config
    # Supports: openrouter, huggingface, ollama, gemini, mock
    MODEL_PROVIDER: str = "openrouter"
    
    # Official Gemma 4 models
    # Primary: google/gemma-4-31b-it or google/gemma-4-26b-a4b-it
    GEMMA_MODEL_NAME: str = "google/gemma-4-31b-it"
    
    # API Keys & Endpoints (Optional; fallback to deterministic grounding mock if not set)
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    HUGGINGFACE_API_KEY: Optional[str] = None
    HUGGINGFACE_BASE_URL: str = "https://api-inference.huggingface.co/models"
    
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    GEMINI_API_KEY: Optional[str] = None
    
    # Request limits & security
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_IMAGE_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/tiff",
        "application/pdf",
        "application/x-pdf"
    ]
    
    # CORS (Explicit origins required when allow_credentials=True for session cookies)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # Database & Authentication Store
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "suchnasetu.db"))

    # Environment & Deployment Mode
    ENVIRONMENT: str = "development"

    # Auth & Session Config
    AUTH_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "suchnasetu-dev-insecure-secret-key-change-in-production")
    AUTH_PUBLIC_APP_URL: str = "http://localhost:5173"
    AUTH_COOKIE_NAME: str = "suchnasetu_session"
    AUTH_COOKIE_SECURE: bool = False  # Set to True for production HTTPS
    AUTH_COOKIE_SAMESITE: str = "lax"
    AUTH_SESSION_EXPIRE_HOURS: int = 168  # 7 days
    AUTH_TOKEN_EXPIRE_MINUTES: int = 15   # 15 minutes for password recovery
    AUTH_VERIFY_EXPIRE_HOURS: int = 24    # 24 hours for email verification

    # Email Delivery Config
    # Supports: "smtp", "console" (Development only)
    AUTH_EMAIL_BACKEND: str = "console"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "SuchnaSetu AI <notifications@example.com>")
    SMTP_USE_TLS: bool = True

    _backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    _root_dir = os.path.dirname(_backend_dir)

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(_backend_dir, ".env"),
            os.path.join(_root_dir, ".env"),
            ".env"
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

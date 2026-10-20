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
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

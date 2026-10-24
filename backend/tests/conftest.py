import pytest
import asyncio
from typing import Generator
from fastapi.testclient import TestClient
from app.main import app
from app.api.auth_routes import get_current_user
from app.db.database import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema is created before running any test sessions."""
    asyncio.run(init_db())

@pytest.fixture(autouse=True)
def default_auth_override(request):
    """
    Automatically provide a verified test user for legacy test files so that
    existing tests for OCR, Q&A, evidence, and localization continue passing smoothly.
    For dedicated auth tests (marked or inside test_auth.py), do NOT override.
    """
    # If the test is in test_auth.py, we want real auth testing, so don't mock get_current_user
    if "test_auth" in request.node.nodeid:
        yield
        return

    app.dependency_overrides[get_current_user] = lambda: {
        "id": "usr_test_default_citizen",
        "email": "citizen@suchnasetu.gov.in",
        "name": "Verified Citizen",
        "is_verified": True,
        "created_at": "2026-10-24T00:00:00Z"
    }
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_current_user, None)

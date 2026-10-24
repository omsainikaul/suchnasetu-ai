import pytest
import httpx
from unittest.mock import patch, AsyncMock
from app.services.gemma_adapter import GemmaAdapter

@pytest.mark.asyncio
async def test_json_block_extraction():
    adapter = GemmaAdapter()

    # 1. Clean JSON
    res1 = adapter._extract_json_block('{"status": "ok"}')
    assert res1 == {"status": "ok"}

    # 2. Markdown wrapped
    res2 = adapter._extract_json_block('```json\n{"summary": "Test notice"}\n```')
    assert res2 == {"summary": "Test notice"}

    # 3. Text with surrounding chatter
    res3 = adapter._extract_json_block('Here is the requested output:\n{"key": 123}\nHope this helps!')
    assert res3 == {"key": 123}

    # 4. Malformed JSON raises json.JSONDecodeError
    import json
    with pytest.raises(json.JSONDecodeError):
        adapter._extract_json_block("This is not JSON at all.")

@pytest.mark.asyncio
async def test_live_inference_auth_error_fallback():
    """Verify that HTTP 401 (Invalid Credentials) falls back gracefully to deterministic engine."""
    adapter = GemmaAdapter()
    adapter.provider = "openrouter"
    adapter.openrouter_key = "sk-or-v1-invalid-dummy-key"

    # Mock httpx to simulate a 401 Unauthorized response
    mock_resp = httpx.Response(status_code=401, request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"))
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        parsed, is_mock, model_id = await adapter.analyze_notice("1. PURPOSE: Test notice\n2. DEADLINE: 10/10/2026")

        # Must fall back gracefully to deterministic grounding without raising an unhandled exception
        assert is_mock is True
        assert "Deterministic Evaluation Adapter" in model_id
        assert parsed["fields"]["deadline"]["status"] == "found"
        assert "10/10/2026" in str(parsed["fields"]["deadline"]["value"])

@pytest.mark.asyncio
async def test_live_inference_timeout_fallback():
    """Verify that timeout falls back gracefully to deterministic engine."""
    adapter = GemmaAdapter()
    adapter.provider = "openrouter"
    adapter.openrouter_key = "sk-or-v1-dummy-key"

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Connection timed out")):
        parsed, is_mock, model_id = await adapter.analyze_notice("1. PURPOSE: Test notice\n2. DEADLINE: 10/10/2026")

        assert is_mock is True
        assert "Deterministic Evaluation Adapter" in model_id
        assert parsed["fields"]["deadline"]["status"] == "found"

@pytest.mark.asyncio
async def test_live_inference_malformed_json_fallback():
    """Verify that non-JSON response from LLM falls back gracefully."""
    adapter = GemmaAdapter()
    adapter.provider = "openrouter"
    adapter.openrouter_key = "sk-or-v1-dummy-key"

    mock_resp = httpx.Response(
        status_code=200,
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
        json={"choices": [{"message": {"content": "I am an AI and I cannot produce JSON right now."}}]}
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        parsed, is_mock, model_id = await adapter.analyze_notice("1. PURPOSE: Test notice\n2. DEADLINE: 10/10/2026")

        assert is_mock is True
        assert "Deterministic Evaluation Adapter" in model_id
        assert parsed["fields"]["deadline"]["status"] == "found"

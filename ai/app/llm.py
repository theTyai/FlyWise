"""Thin, provider-agnostic LLM client using only the standard library.

Supported LLM_PROVIDER values:
  none      - no LLM; callers use deterministic results
  gemini    - Google Gemini via Generative Language REST API (free tier)
  anthropic - Claude via the Messages API
  openai    - any OpenAI-compatible chat-completions endpoint
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request

from .config import settings


class LLMError(RuntimeError):
    pass


def is_configured() -> bool:
    if settings.llm_provider == "gemini":
        return bool(settings.gemini_api_key)
    if settings.llm_provider == "anthropic":
        return bool(settings.anthropic_api_key)
    if settings.llm_provider == "openai":
        return bool(settings.openai_api_key)
    return False


def status() -> dict:
    return {
        "provider": settings.llm_provider,
        "model": settings.llm_model if is_configured() else None,
        "configured": is_configured(),
        "fallback": "Deterministic ranking with template explanations",
    }


def _post(url: str, headers: dict, body: dict) -> dict:
    request = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), headers={"content-type": "application/json", **headers}, method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.llm_timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        raise LLMError(f"LLM provider returned HTTP {err.code}") from err
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as err:
        raise LLMError(f"LLM provider unreachable: {err}") from err


def complete(system: str, user: str, max_tokens: int = 700) -> str:
    """Return the model's text reply, or raise LLMError."""
    if not is_configured():
        raise LLMError("No LLM provider configured")
    try:
        if settings.llm_provider == "gemini":
            model = settings.llm_model or "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.gemini_api_key}"
            body = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system}\n\nStrict Output Requirement: Respond with valid JSON only.\n\nInput:\n{user}"}],
                    }
                ],
                "generationConfig": {
                    "maxOutputTokens": max_tokens,
                    "temperature": 0.2,
                    "responseMimeType": "application/json",
                },
            }
            data = _post(url, {}, body)
            return data["candidates"][0]["content"]["parts"][0]["text"]

        if settings.llm_provider == "anthropic":
            data = _post(
                "https://api.anthropic.com/v1/messages",
                {"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01"},
                {"model": settings.llm_model, "max_tokens": max_tokens, "system": system,
                 "messages": [{"role": "user", "content": user}]},
            )
            return "".join(block.get("text", "") for block in data["content"] if block.get("type") == "text")
        data = _post(
            f"{settings.openai_base_url}/chat/completions",
            {"authorization": f"Bearer {settings.openai_api_key}"},
            {"model": settings.llm_model, "max_tokens": max_tokens,
             "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
        )
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as err:
        raise LLMError("LLM provider returned an unexpected response shape") from err


def extract_json(text: str) -> str:
    """Pull the first top-level JSON object out of a reply (models sometimes wrap it in prose or fences)."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise LLMError("No JSON object found in LLM reply")
    return text[start : end + 1]

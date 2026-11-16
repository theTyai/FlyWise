"""Configuration for the AI recommendation service.

Reads the single root .env file (shared with the Node services) without overriding
variables that are already set in the environment, so Docker and the shell both win.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional


def _find_root_env() -> Optional[Path]:
    """Walk up from this file to the first folder that holds a .env file.

    In the repository that is the project root (three folders up). Inside the Docker
    image there is no .env at all - settings arrive as environment variables - so this
    returns None instead of failing.
    """
    for folder in list(Path(__file__).resolve().parents)[:4]:
        candidate = folder / ".env"
        if candidate.is_file():
            return candidate
    return None


ROOT_ENV = _find_root_env()


def _load_env_file(path: Optional[Path]) -> None:
    if path is None:
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_env_file(ROOT_ENV)


def _float(name: str, default: float) -> float:
    try:
        val_str = os.environ.get(name, "").strip()
        if not val_str:
            return default
        value = float(val_str)
        return value if value >= 0 else default
    except ValueError:
        return default


class Settings:
    def __init__(self) -> None:
        self.llm_provider = os.environ.get("LLM_PROVIDER", "none").strip().lower() or "none"
        self.llm_model = os.environ.get("LLM_MODEL", "claude-3-5-haiku-20241022").strip()
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        self.openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.openai_base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.internal_key = os.environ.get("INTERNAL_SERVICE_KEY", "").strip()
        self.llm_timeout_seconds = _float("LLM_TIMEOUT_SECONDS", 12.0)
        # Default weights for "best overall": price 50%, duration 35%, stops 15%.
        self.weight_price = _float("WEIGHT_PRICE", 0.50)
        self.weight_duration = _float("WEIGHT_DURATION", 0.35)
        self.weight_stops = _float("WEIGHT_STOPS", 0.15)

    @property
    def base_weights(self) -> dict[str, float]:
        total = self.weight_price + self.weight_duration + self.weight_stops
        return {
            "price": self.weight_price / total,
            "duration": self.weight_duration / total,
            "stops": self.weight_stops / total,
        }


settings = Settings()

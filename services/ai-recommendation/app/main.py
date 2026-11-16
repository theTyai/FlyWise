"""FlyWise AI recommendation service (FastAPI).

Run from the project root:  npm run dev:ai
Or directly:                python -m uvicorn app.main:app --port 8000 --app-dir services/ai-recommendation

This service has no database access. It receives normalised flight data from the
user backend and returns ranked recommendations as validated JSON.
"""
from __future__ import annotations

import hmac
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException

from . import llm, preferences, ranking
from .config import settings
from .schemas import (
    ExplainRequest, ExplainResponse, ParseRequest, ParseResponse, RecommendRequest, RecommendResponse,
)

app = FastAPI(title="FlyWise AI Recommendation Service", version="1.0.0")


def require_internal_key(x_internal_key: Optional[str] = Header(default=None)) -> None:
    """Only FlyWise backends may call the ranking endpoints."""
    if not settings.internal_key:
        return
    if not x_internal_key or not hmac.compare_digest(x_internal_key, settings.internal_key):
        raise HTTPException(status_code=401, detail="Invalid or missing internal service key")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ai-recommendation", "llm": llm.status()}


@app.get("/models/status")
def models_status() -> dict:
    return {**llm.status(), "weights": settings.base_weights}


@app.post("/recommend", response_model=RecommendResponse, dependencies=[Depends(require_internal_key)])
def recommend(body: RecommendRequest) -> dict:
    prefs = body.preferences
    notes: list[str] = []
    if body.naturalLanguage and body.naturalLanguage.strip():
        _, parsed, understood = preferences.parse(body.naturalLanguage)
        prefs = preferences.merge(prefs, parsed)
        if understood:
            notes.append("From your note we understood: " + "; ".join(understood) + ".")
    result = ranking.recommend(body.flights, prefs, body.currency, body.naturalLanguage)
    result["notes"] = notes + result["notes"]
    return result


@app.post("/parse-preferences", response_model=ParseResponse, dependencies=[Depends(require_internal_key)])
def parse_preferences(body: ParseRequest) -> dict:
    engine, prefs, understood = preferences.parse(body.text)
    return {"engine": engine, "preferences": prefs, "understood": understood}


@app.post("/explain", response_model=ExplainResponse, dependencies=[Depends(require_internal_key)])
def explain(body: ExplainRequest) -> dict:
    try:
        engine, text = ranking.explain(body.flight, body.category, body.alternatives, body.currency)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    return {"engine": engine, "explanation": text}

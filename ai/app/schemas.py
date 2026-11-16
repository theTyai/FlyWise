"""Pydantic contracts for the AI recommendation service."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

Priority = Literal["BALANCED", "CHEAPEST", "FASTEST"]
DepartureWindow = Literal["MORNING", "AFTERNOON", "EVENING", "NIGHT"]
Category = Literal["CHEAPEST", "FASTEST", "BEST_OVERALL"]


class Preferences(BaseModel):
    priority: Priority = "BALANCED"
    maxPrice: Optional[float] = Field(default=None, gt=0)
    nonStopOnly: bool = False
    maxDurationMinutes: Optional[int] = Field(default=None, gt=0)
    departurePreference: Optional[DepartureWindow] = None


class Flight(BaseModel):
    """One normalised flight offer. Only these fields are ever shown to the LLM."""

    id: str = Field(min_length=1)
    price: float = Field(gt=0)
    durationMinutes: int = Field(gt=0)
    stops: int = Field(ge=0)
    departureHour: Optional[int] = Field(default=None, ge=0, le=23)
    airline: Optional[str] = None
    flightNumber: Optional[str] = None
    baggage: Optional[str] = None

    @field_validator("price")
    @classmethod
    def price_is_finite(cls, value: float) -> float:
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError("price must be a finite number")
        return value


class RecommendRequest(BaseModel):
    preferences: Preferences = Preferences()
    naturalLanguage: Optional[str] = Field(default=None, max_length=400)
    currency: str = "INR"
    # Raw dicts on purpose: one malformed record is skipped, not a 422 for the whole search.
    flights: list[dict[str, Any]] = Field(default_factory=list, max_length=200)


class Recommendation(BaseModel):
    flightId: str
    category: Category
    reason: str
    score: float


class RecommendResponse(BaseModel):
    engine: Literal["LLM", "DETERMINISTIC"]
    model: Optional[str] = None
    preferences: Preferences
    weights: dict[str, float]
    notes: list[str]
    recommendations: list[Recommendation]
    scores: dict[str, float]


class LLMPick(BaseModel):
    """Shape the LLM must return for each recommendation."""

    flightId: str
    category: Category
    reason: str = Field(min_length=8, max_length=400)


class LLMRecommendationSet(BaseModel):
    recommendations: list[LLMPick] = Field(min_length=1, max_length=3)


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=400)


class ParseResponse(BaseModel):
    engine: Literal["LLM", "RULES"]
    preferences: Preferences
    understood: list[str]


class ExplainRequest(BaseModel):
    flight: dict[str, Any]
    category: Category
    alternatives: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
    currency: str = "INR"


class ExplainResponse(BaseModel):
    engine: Literal["LLM", "DETERMINISTIC"]
    explanation: str

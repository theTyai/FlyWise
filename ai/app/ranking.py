"""Hybrid flight ranking.

Step 1 (always): deterministic maths picks the cheapest, the fastest and the
best-scoring flight. Prices and durations are numbers, so an algorithm decides them.

Step 2 (optional): an LLM may choose a different BEST_OVERALL from the shortlist
and write the explanations. Its output is validated against the candidate list;
anything it gets wrong is replaced by the deterministic result. The LLM never
changes which flight is cheapest or fastest, and never supplies a price.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Optional

from pydantic import ValidationError

from . import llm
from .config import settings
from .schemas import Flight, LLMRecommendationSet, Preferences, Recommendation

WINDOW_HOURS = {
    "MORNING": range(5, 12),
    "AFTERNOON": range(12, 17),
    "EVENING": range(17, 21),
    "NIGHT": tuple(list(range(21, 24)) + list(range(0, 5))),
}
DEPARTURE_BONUS = 0.08
CURRENCY_SYMBOL = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}


def validate_flights(raw_flights: list[dict[str, Any]]) -> tuple[list[Flight], int]:
    """Keep well-formed records; count the rest. Duplicate ids keep the first."""
    valid: list[Flight] = []
    seen: set[str] = set()
    skipped = 0
    for raw in raw_flights:
        try:
            flight = Flight(**raw)
        except (ValidationError, TypeError):
            skipped += 1
            continue
        if flight.id in seen:
            skipped += 1
            continue
        seen.add(flight.id)
        valid.append(flight)
    return valid, skipped


def normalise(values: list[float]) -> list[float]:
    """Map values to 0..1 where the LOWEST value scores 1. Equal values all score 1."""
    low, high = min(values), max(values)
    if high == low:
        return [1.0 for _ in values]
    return [(high - v) / (high - low) for v in values]


def stops_score(stops: int) -> float:
    return 1.0 if stops == 0 else 0.5 if stops == 1 else 0.0


def weights_for(priority: str, base: Optional[dict[str, float]] = None) -> dict[str, float]:
    """Shift the configured weights toward what the traveller said matters most."""
    base = base or settings.base_weights
    if priority == "CHEAPEST":
        return {"price": 0.70, "duration": 0.20, "stops": 0.10}
    if priority == "FASTEST":
        return {"price": 0.25, "duration": 0.60, "stops": 0.15}
    return dict(base)


def apply_filters(flights: list[Flight], prefs: Preferences) -> tuple[list[Flight], list[str]]:
    """Hard constraints. If nothing survives, relax them and say so."""
    notes: list[str] = []
    kept = flights
    if prefs.nonStopOnly:
        kept = [f for f in kept if f.stops == 0]
    if prefs.maxPrice:
        kept = [f for f in kept if f.price <= prefs.maxPrice]
    if prefs.maxDurationMinutes:
        kept = [f for f in kept if f.durationMinutes <= prefs.maxDurationMinutes]
    if not kept and flights:
        notes.append("No flight met every preference, so these are the closest options from the full list.")
        return flights, notes
    if len(kept) < len(flights):
        notes.append(f"{len(flights) - len(kept)} of {len(flights)} flights were left out because they did not meet your preferences.")
    return kept, notes


def score_flights(flights: list[Flight], prefs: Preferences, weights: dict[str, float]) -> dict[str, float]:
    price_scores = normalise([f.price for f in flights])
    time_scores = normalise([float(f.durationMinutes) for f in flights])
    scores: dict[str, float] = {}
    for flight, p, t in zip(flights, price_scores, time_scores):
        score = weights["price"] * p + weights["duration"] * t + weights["stops"] * stops_score(flight.stops)
        if prefs.departurePreference and flight.departureHour is not None:
            if flight.departureHour in WINDOW_HOURS[prefs.departurePreference]:
                score += DEPARTURE_BONUS
        scores[flight.id] = round(min(score, 1.0), 4)
    return scores


def fmt_duration(minutes: int) -> str:
    hours, mins = divmod(int(minutes), 60)
    return f"{hours}h {mins:02d}m" if hours else f"{mins}m"


def fmt_money(amount: float, currency: str) -> str:
    return f"{CURRENCY_SYMBOL.get(currency, currency + ' ')}{amount:,.0f}"


def stops_text(stops: int) -> str:
    return "non-stop" if stops == 0 else "1 stop" if stops == 1 else f"{stops} stops"


@dataclass
class Ranking:
    flights: list[Flight]
    scores: dict[str, float]
    picks: dict[str, Flight] = field(default_factory=dict)  # category -> flight
    true_fastest_id: Optional[str] = None
    top_score_id: Optional[str] = None


def pick_three(flights: list[Flight], scores: dict[str, float]) -> Ranking:
    """Choose distinct flights for CHEAPEST, FASTEST and BEST_OVERALL.

    CHEAPEST is always the true lowest fare. If that flight is also the fastest
    or the top scorer, the next distinct flight takes the other label - the same
    flight is never shown twice.
    """
    ranking = Ranking(flights=flights, scores=scores)
    if not flights:
        return ranking
    by_price = sorted(flights, key=lambda f: (f.price, -scores[f.id], f.durationMinutes))
    by_time = sorted(flights, key=lambda f: (f.durationMinutes, f.price))
    by_score = sorted(flights, key=lambda f: (-scores[f.id], f.price))
    ranking.true_fastest_id = by_time[0].id
    ranking.top_score_id = by_score[0].id

    taken: set[str] = set()
    ranking.picks["CHEAPEST"] = by_price[0]
    taken.add(by_price[0].id)
    for flight in by_time:
        if flight.id not in taken:
            ranking.picks["FASTEST"] = flight
            taken.add(flight.id)
            break
    for flight in by_score:
        if flight.id not in taken:
            ranking.picks["BEST_OVERALL"] = flight
            taken.add(flight.id)
            break
    return ranking


def template_reason(category: str, flight: Flight, ranking: Ranking, prefs: Preferences, currency: str) -> str:
    flights = ranking.flights
    count = len(flights)
    avg_price = sum(f.price for f in flights) / count
    avg_time = sum(f.durationMinutes for f in flights) / count
    facts = f"{fmt_money(flight.price, currency)}, {fmt_duration(flight.durationMinutes)}, {stops_text(flight.stops)}"

    if category == "CHEAPEST":
        text = f"Lowest fare of the {count} flights compared: {fmt_money(flight.price, currency)}"
        saving = avg_price - flight.price
        if saving >= 1:
            text += f", about {fmt_money(saving, currency)} below the average"
        text += f". The journey takes {fmt_duration(flight.durationMinutes)}, {stops_text(flight.stops)}."
        if ranking.true_fastest_id == flight.id and count > 1:
            text += " It is also the quickest flight on this route."
        return text

    if category == "FASTEST":
        if ranking.true_fastest_id == flight.id:
            text = f"Shortest journey of the {count} flights compared: {fmt_duration(flight.durationMinutes)}, {stops_text(flight.stops)}"
            gain = avg_time - flight.durationMinutes
            if gain >= 5:
                text += f", about {fmt_duration(int(gain))} quicker than the average"
            return text + f". The fare is {fmt_money(flight.price, currency)}."
        return (
            f"The cheapest flight is also the quickest, so this is the next shortest journey: "
            f"{fmt_duration(flight.durationMinutes)}, {stops_text(flight.stops)}, for {fmt_money(flight.price, currency)}."
        )

    score = ranking.scores[flight.id]
    lead = "Strongest balance of fare, journey time and stops" if ranking.top_score_id == flight.id \
        else "Next strongest balance of fare, journey time and stops after the flights above"
    text = f"{lead} (score {score:.2f} out of 1): {facts}."
    if prefs.departurePreference and flight.departureHour is not None \
            and flight.departureHour in WINDOW_HOURS[prefs.departurePreference]:
        text += f" It leaves in the {prefs.departurePreference.lower()}, as you asked."
    return text


LLM_SYSTEM = """You are the recommendation writer for FlyWise, a flight booking site.
You receive flight options that have already been scored, and the three flights a scoring
algorithm picked. Your job:
1. For CHEAPEST and FASTEST keep the given flightId and write the reason.
2. For BEST_OVERALL you may keep the given flight or choose a different one from "candidates"
   if it suits the traveller's preferences better. It must differ from the other two.
3. Write each reason in one or two plain sentences addressed to the traveller.

Rules:
- Only use flight IDs that appear in the input.
- Never invent or alter prices, times, stops, baggage or availability. Quote numbers exactly as given.
- Do not claim a seat is available.
- Return JSON only: {"recommendations": [{"flightId": "...", "category": "CHEAPEST|FASTEST|BEST_OVERALL", "reason": "..."}]}"""

NUMBER_RE = re.compile(r"\d[\d,]*\.?\d*")


def reason_numbers_are_grounded(reason: str, flights: list[Flight]) -> bool:
    """Reject a reason that quotes a large number (a fare) that is not a real fare from the input."""
    known_numbers = {round(f.price) for f in flights}
    for f in flights:
        if f.flightNumber:
            for num in re.findall(r"\d+", f.flightNumber):
                known_numbers.add(int(num))
        known_numbers.add(f.durationMinutes)
    known_numbers.update(range(2024, 2031))

    for token in NUMBER_RE.findall(reason):
        try:
            value = round(float(token.replace(",", "").rstrip(".")))
        except ValueError:
            continue
        if value >= 500 and value not in known_numbers:
            price_diffs = {abs(round(f1.price) - round(f2.price)) for f1 in flights for f2 in flights}
            if value not in price_diffs:
                return False
    return True


def llm_refine(ranking: Ranking, prefs: Preferences, currency: str, natural_language: Optional[str]):
    """Ask the LLM for reasons and an optional BEST_OVERALL swap. Returns (picks, reasons) or raises."""
    shortlist_ids = {f.id for f in ranking.picks.values()}
    for flight in sorted(ranking.flights, key=lambda f: -ranking.scores[f.id])[:8]:
        shortlist_ids.add(flight.id)
    candidates = [f for f in ranking.flights if f.id in shortlist_ids]
    by_id = {f.id: f for f in candidates}

    payload = {
        "travellerPreferences": prefs.model_dump(),
        "travellerSaid": natural_language or None,
        "currency": currency,
        "algorithmPicks": {category: flight.id for category, flight in ranking.picks.items()},
        "candidates": [
            {**f.model_dump(exclude_none=True), "score": ranking.scores[f.id]} for f in candidates
        ],
    }
    raw = llm.complete(LLM_SYSTEM, json.dumps(payload, ensure_ascii=False))
    parsed = LLMRecommendationSet(**json.loads(llm.extract_json(raw)))

    picks = dict(ranking.picks)
    reasons: dict[str, str] = {}
    for item in parsed.recommendations:
        if item.category not in picks or item.flightId not in by_id:
            continue  # unknown category for this search, or an invented flight id
        if item.category in ("CHEAPEST", "FASTEST"):
            if item.flightId != picks[item.category].id:
                continue  # the maths decides these; ignore a disagreeing LLM
        else:
            others = {picks[c].id for c in picks if c != "BEST_OVERALL"}
            if item.flightId in others:
                continue
            picks["BEST_OVERALL"] = by_id[item.flightId]
        if reason_numbers_are_grounded(item.reason, ranking.flights):
            reasons[item.category] = item.reason.strip()
    if not reasons:
        raise llm.LLMError("LLM reply contained no usable recommendation")
    return picks, reasons


def recommend(raw_flights: list[dict[str, Any]], prefs: Preferences, currency: str = "INR",
              natural_language: Optional[str] = None, use_llm: bool = True) -> dict[str, Any]:
    notes: list[str] = []
    flights, skipped = validate_flights(raw_flights)
    if skipped:
        notes.append(f"{skipped} flight record(s) were skipped because they were incomplete or invalid.")

    weights = weights_for(prefs.priority)
    if not flights:
        return {"engine": "DETERMINISTIC", "model": None, "preferences": prefs, "weights": weights,
                "notes": notes, "recommendations": [], "scores": {}}

    candidates, filter_notes = apply_filters(flights, prefs)
    notes.extend(filter_notes)
    scores = score_flights(candidates, prefs, weights)
    ranking = pick_three(candidates, scores)

    engine, model = "DETERMINISTIC", None
    picks = dict(ranking.picks)
    reasons: dict[str, str] = {}
    if use_llm and llm.is_configured():
        try:
            picks, reasons = llm_refine(ranking, prefs, currency, natural_language)
            engine, model = "LLM", settings.llm_model
        except Exception as err:  # unavailable, invalid JSON, schema mismatch -> deterministic
            notes.append("AI explanations were unavailable, so the scoring formula ranked these flights.")
            print(f"[ranking] LLM fallback: {type(err).__name__}: {err}")
            picks = dict(ranking.picks)

    recommendations = [
        Recommendation(
            flightId=picks[category].id,
            category=category,
            reason=reasons.get(category) or template_reason(category, picks[category], ranking, prefs, currency),
            score=scores[picks[category].id],
        )
        for category in ("BEST_OVERALL", "CHEAPEST", "FASTEST")
        if category in picks
    ]
    return {"engine": engine, "model": model, "preferences": prefs, "weights": weights,
            "notes": notes, "recommendations": recommendations, "scores": scores}


def explain(raw_flight: dict[str, Any], category: str, raw_alternatives: list[dict[str, Any]], currency: str):
    """Explain one flight in the context of its alternatives. Returns (engine, text)."""
    flights, _ = validate_flights([raw_flight] + list(raw_alternatives))
    if not flights or flights[0].id != str(raw_flight.get("id")):
        raise ValueError("The flight to explain is missing required fields")
    target = flights[0]
    prefs = Preferences()
    scores = score_flights(flights, prefs, weights_for("BALANCED"))
    ranking = pick_three(flights, scores)
    fallback = template_reason(category, target, ranking, prefs, currency)
    if llm.is_configured():
        try:
            system = ("Explain in two plain sentences why this flight fits the given category. "
                      "Quote numbers exactly as given. Never invent details or availability.")
            user = json.dumps({"category": category, "flight": target.model_dump(exclude_none=True),
                               "alternatives": [f.model_dump(exclude_none=True) for f in flights[1:9]],
                               "currency": currency}, ensure_ascii=False)
            text = llm.complete(system, user, max_tokens=200).strip()
            if 8 <= len(text) <= 500 and reason_numbers_are_grounded(text, flights):
                return "LLM", text
        except Exception:
            pass
    return "DETERMINISTIC", fallback

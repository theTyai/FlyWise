"""Turn a traveller's sentence into structured preferences.

A rule-based parser always runs, so the feature works without any API key.
When an LLM is configured it is asked first and its answer is validated against
the same Pydantic model; anything invalid falls back to the rules.
"""
from __future__ import annotations

import json
import re

from . import llm
from .schemas import Preferences

WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "an": 1, "a": 1,
}
NUM = r"(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|an|a)"

DURATION_RE = re.compile(
    r"(?:(?:don'?t|do not) want to (?:travel|fly) for (?:more than|longer than)|not (?:more|longer) than|no (?:more|longer) than|under|within|below|less than|at most|max(?:imum)?(?: of)?|upto|up to|more than|longer than|over|exceed(?:s|ing)?)\s+"
    + NUM + r"\s*(?:and a half\s*)?(hours?|hrs?|hr|h|minutes?|mins?|min)\b"
)
HALF_RE = re.compile(r"and a half")
PRICE_CUE_RE = re.compile(
    r"(?:under|below|less than|within|at most|max(?:imum)?(?: of)?|budget(?: of| is)?|no more than|upto|up to)\s*"
    r"(?:rs\.?|inr|₹|rupees)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand)?\b"
)
PRICE_CURRENCY_RE = re.compile(r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(k|thousand)?\b")

CHEAP_RE = re.compile(r"\b(cheap(?:est|er)?|budget(?!\s*(?:of|is)?\s*(?:rs\.?|inr|₹|rupees)?\s*\d)|affordable|economical|lowest (?:price|fare)|least expensive|save money)\b")
FAST_RE = re.compile(r"\b(fast(?:est|er)?|quick(?:est|er)?|shortest|soonest|asap|in a hurry)\b")
NONSTOP_RE = re.compile(r"\b(non[- ]?stop|direct(?: flight)?s?|no (?:stops?|layovers?|connections?)|without (?:a )?(?:stop|layover)s?)\b")
WINDOWS = [
    ("NIGHT", re.compile(r"\b(late night|night|red[- ]?eye|overnight)\b")),
    ("MORNING", re.compile(r"\b(early morning|morning|a\.?m\.?|before noon)\b")),
    ("AFTERNOON", re.compile(r"\b(afternoon|midday|noon)\b")),
    ("EVENING", re.compile(r"\b(evening|after work)\b")),
]


def _number(token: str) -> float:
    return float(WORD_NUMBERS.get(token, token)) if token in WORD_NUMBERS else float(token)


def parse_rules(text: str) -> tuple[Preferences, list[str]]:
    """Deterministic parser. Returns preferences and a plain-language list of what was understood."""
    t = " ".join(text.lower().split())
    prefs: dict = {}
    understood: list[str] = []

    # Duration first, then remove it so "under 3 hours" is never read as a price.
    match = DURATION_RE.search(t)
    if match:
        amount = _number(match.group(1))
        unit = match.group(2)
        minutes = amount * 60 if unit.startswith("h") else amount
        if HALF_RE.search(match.group(0)) and unit.startswith("h"):
            minutes += 30
        minutes = int(round(minutes))
        if 20 <= minutes <= 48 * 60:
            prefs["maxDurationMinutes"] = minutes
            hours, mins = divmod(minutes, 60)
            understood.append(f"Journey no longer than {hours}h {mins:02d}m" if hours else f"Journey no longer than {mins} min")
        t = t[: match.start()] + " " + t[match.end():]

    price_match = PRICE_CUE_RE.search(t) or PRICE_CURRENCY_RE.search(t)
    if price_match:
        value = float(price_match.group(1).replace(",", ""))
        if price_match.group(2):
            value *= 1000
        if value >= 500:  # ignore stray small numbers such as "under 2 stops"
            prefs["maxPrice"] = value
            understood.append(f"Fare up to ₹{value:,.0f}")

    cheap, fast = CHEAP_RE.search(t), FAST_RE.search(t)
    if cheap and not fast:
        prefs["priority"] = "CHEAPEST"
        understood.append("Lowest fare matters most")
    elif fast and not cheap:
        prefs["priority"] = "FASTEST"
        understood.append("Shortest journey matters most")
    elif cheap and fast:
        understood.append("Balance fare and journey time")

    if NONSTOP_RE.search(t):
        prefs["nonStopOnly"] = True
        understood.append("Non-stop flights only")

    for window, pattern in WINDOWS:
        if pattern.search(t):
            prefs["departurePreference"] = window
            understood.append(f"{window.capitalize()} departure preferred")
            break

    return Preferences(**prefs), understood


PARSE_SYSTEM = """You convert a traveller's sentence into flight search preferences.
Return JSON only, with exactly these keys:
{"priority": "BALANCED" | "CHEAPEST" | "FASTEST",
 "maxPrice": number or null,
 "nonStopOnly": true or false,
 "maxDurationMinutes": integer or null,
 "departurePreference": "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | null}
Use null when the sentence does not mention something. Never guess a value."""


def describe(prefs: Preferences) -> list[str]:
    out: list[str] = []
    if prefs.priority == "CHEAPEST":
        out.append("Lowest fare matters most")
    if prefs.priority == "FASTEST":
        out.append("Shortest journey matters most")
    if prefs.maxPrice:
        out.append(f"Fare up to ₹{prefs.maxPrice:,.0f}")
    if prefs.maxDurationMinutes:
        hours, mins = divmod(prefs.maxDurationMinutes, 60)
        out.append(f"Journey no longer than {hours}h {mins:02d}m")
    if prefs.nonStopOnly:
        out.append("Non-stop flights only")
    if prefs.departurePreference:
        out.append(f"{prefs.departurePreference.capitalize()} departure preferred")
    return out


def parse(text: str) -> tuple[str, Preferences, list[str]]:
    """Returns (engine, preferences, understood)."""
    if llm.is_configured():
        try:
            raw = llm.complete(PARSE_SYSTEM, text, max_tokens=200)
            prefs = Preferences(**json.loads(llm.extract_json(raw)))
            return "LLM", prefs, describe(prefs)
        except Exception:  # invalid or unavailable -> rules
            pass
    prefs, understood = parse_rules(text)
    return "RULES", prefs, understood


def merge(structured: Preferences, parsed: Preferences) -> Preferences:
    """Form fields win; the sentence fills in whatever the form left at its default."""
    data = structured.model_dump()
    defaults = Preferences().model_dump()
    for key, value in parsed.model_dump().items():
        if data[key] == defaults[key] and value != defaults[key]:
            data[key] = value
    return Preferences(**data)

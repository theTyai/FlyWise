"""Unit tests for the ranking engine and preference parser.  Run: python -m pytest services/ai-recommendation -q"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import llm, ranking  # noqa: E402
from app.preferences import merge, parse_rules  # noqa: E402
from app.schemas import Preferences  # noqa: E402

FLIGHTS = [
    {"id": "F1", "price": 4200, "durationMinutes": 90, "stops": 0, "departureHour": 8},
    {"id": "F2", "price": 3500, "durationMinutes": 150, "stops": 1, "departureHour": 14},
    {"id": "F3", "price": 6500, "durationMinutes": 75, "stops": 0, "departureHour": 19},
    {"id": "F4", "price": 5200, "durationMinutes": 95, "stops": 0, "departureHour": 6},
]


def picks(result):
    return {r.category: r.flightId for r in result["recommendations"]}


def test_cheapest_and_fastest_are_mathematically_correct():
    result = ranking.recommend(FLIGHTS, Preferences(), use_llm=False)
    chosen = picks(result)
    assert chosen["CHEAPEST"] == "F2"
    assert chosen["FASTEST"] == "F3"
    assert chosen["BEST_OVERALL"] == "F1"
    assert result["engine"] == "DETERMINISTIC"


def test_three_recommendations_are_distinct():
    result = ranking.recommend(FLIGHTS, Preferences(), use_llm=False)
    ids = [r.flightId for r in result["recommendations"]]
    assert len(ids) == len(set(ids)) == 3


def test_same_flight_cheapest_and_fastest_is_not_duplicated():
    flights = [
        {"id": "A", "price": 3000, "durationMinutes": 60, "stops": 0},
        {"id": "B", "price": 4000, "durationMinutes": 80, "stops": 0},
        {"id": "C", "price": 5000, "durationMinutes": 70, "stops": 0},
    ]
    result = ranking.recommend(flights, Preferences(), use_llm=False)
    chosen = picks(result)
    assert chosen["CHEAPEST"] == "A"
    assert chosen["FASTEST"] == "C"  # next quickest distinct flight
    assert chosen["BEST_OVERALL"] == "B"
    reasons = {r.category: r.reason for r in result["recommendations"]}
    assert "also the quickest" in reasons["CHEAPEST"]
    assert "next shortest" in reasons["FASTEST"]


def test_equal_values_do_not_divide_by_zero():
    flights = [{"id": str(i), "price": 4000, "durationMinutes": 90, "stops": 0} for i in range(3)]
    result = ranking.recommend(flights, Preferences(), use_llm=False)
    assert len(result["recommendations"]) == 3
    assert all(score == 1.0 for score in result["scores"].values())


def test_invalid_records_are_skipped_not_fatal():
    flights = FLIGHTS + [
        {"id": "BAD1", "price": -5, "durationMinutes": 90, "stops": 0},
        {"id": "BAD2", "durationMinutes": 90, "stops": 0},
        {"id": "F1", "price": 1, "durationMinutes": 1, "stops": 0},  # duplicate id
    ]
    result = ranking.recommend(flights, Preferences(), use_llm=False)
    assert picks(result)["CHEAPEST"] == "F2"
    assert any("skipped" in note for note in result["notes"])


def test_fewer_than_three_flights_and_empty_list():
    assert len(ranking.recommend(FLIGHTS[:1], Preferences(), use_llm=False)["recommendations"]) == 1
    assert ranking.recommend([], Preferences(), use_llm=False)["recommendations"] == []


def test_hard_filters_and_relaxation():
    nonstop = ranking.recommend(FLIGHTS, Preferences(nonStopOnly=True), use_llm=False)
    assert "F2" not in picks(nonstop).values()
    impossible = ranking.recommend(FLIGHTS, Preferences(maxPrice=1000), use_llm=False)
    assert len(impossible["recommendations"]) == 3
    assert any("closest options" in note for note in impossible["notes"])


def test_priority_changes_weights():
    assert ranking.weights_for("CHEAPEST")["price"] > ranking.weights_for("BALANCED")["price"]
    assert ranking.weights_for("FASTEST")["duration"] > ranking.weights_for("BALANCED")["duration"]
    assert abs(sum(ranking.weights_for("BALANCED").values()) - 1) < 1e-9


def test_departure_preference_earns_a_bonus():
    plain = ranking.recommend(FLIGHTS, Preferences(), use_llm=False)["scores"]
    morning = ranking.recommend(FLIGHTS, Preferences(departurePreference="MORNING"), use_llm=False)["scores"]
    assert morning["F4"] > plain["F4"]
    assert morning["F2"] == plain["F2"]


def test_natural_language_parsing():
    prefs, understood = parse_rules(
        "I want the cheapest flight, but I don't want to travel for more than three hours. Prefer morning departures."
    )
    assert prefs.priority == "CHEAPEST"
    assert prefs.maxDurationMinutes == 180
    assert prefs.departurePreference == "MORNING"
    assert prefs.nonStopOnly is False
    assert len(understood) == 3

    prefs, _ = parse_rules("direct flight under Rs 6,000 in the evening")
    assert prefs.nonStopOnly is True and prefs.maxPrice == 6000 and prefs.departurePreference == "EVENING"

    prefs, _ = parse_rules("fastest option, budget 8k")
    assert prefs.priority == "FASTEST" and prefs.maxPrice == 8000

    prefs, _ = parse_rules("anything is fine")
    assert prefs == Preferences()


def test_form_fields_win_over_sentence():
    merged = merge(Preferences(priority="FASTEST"), Preferences(priority="CHEAPEST", nonStopOnly=True))
    assert merged.priority == "FASTEST"
    assert merged.nonStopOnly is True


def _fake_llm(monkeypatch, reply):
    monkeypatch.setattr(llm, "is_configured", lambda: True)
    monkeypatch.setattr(llm, "complete", lambda *args, **kwargs: reply)


def test_llm_with_invented_flight_id_is_rejected(monkeypatch):
    _fake_llm(monkeypatch, json.dumps({"recommendations": [
        {"flightId": "GHOST", "category": "CHEAPEST", "reason": "An invented flight that does not exist."},
    ]}))
    result = ranking.recommend(FLIGHTS, Preferences())
    assert result["engine"] == "DETERMINISTIC"
    assert picks(result)["CHEAPEST"] == "F2"
    assert any("unavailable" in note for note in result["notes"])


def test_llm_cannot_change_the_cheapest_or_invent_a_price(monkeypatch):
    _fake_llm(monkeypatch, json.dumps({"recommendations": [
        {"flightId": "F3", "category": "CHEAPEST", "reason": "Claims a different flight is the cheapest."},
        {"flightId": "F3", "category": "FASTEST", "reason": "Quickest way there at only ₹999 for the trip."},
        {"flightId": "F4", "category": "BEST_OVERALL", "reason": "An early start with a direct flight for ₹5,200."},
    ]}))
    result = ranking.recommend(FLIGHTS, Preferences())
    chosen = picks(result)
    reasons = {r.category: r.reason for r in result["recommendations"]}
    assert result["engine"] == "LLM"
    assert chosen["CHEAPEST"] == "F2"                      # maths wins
    assert chosen["BEST_OVERALL"] == "F4"                  # a valid LLM choice is honoured
    assert "999" not in reasons["FASTEST"]                 # invented fare -> template reason
    assert reasons["BEST_OVERALL"].startswith("An early start")


def test_llm_garbage_falls_back(monkeypatch):
    _fake_llm(monkeypatch, "Sorry, I cannot help with that.")
    result = ranking.recommend(FLIGHTS, Preferences())
    assert result["engine"] == "DETERMINISTIC"
    assert len(result["recommendations"]) == 3


def test_llm_outage_falls_back(monkeypatch):
    monkeypatch.setattr(llm, "is_configured", lambda: True)

    def boom(*args, **kwargs):
        raise llm.LLMError("provider down")

    monkeypatch.setattr(llm, "complete", boom)
    result = ranking.recommend(FLIGHTS, Preferences())
    assert result["engine"] == "DETERMINISTIC"
    assert picks(result) == {"BEST_OVERALL": "F1", "CHEAPEST": "F2", "FASTEST": "F3"}

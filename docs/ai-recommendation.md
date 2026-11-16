# The AI recommendation engine

How FlyWise chooses "best overall", "cheapest" and "fastest", and what role an LLM plays.

- [The idea in one paragraph](#the-idea-in-one-paragraph)
- [Step 1: validate and filter](#step-1-validate-and-filter)
- [Step 2: score every flight](#step-2-score-every-flight)
- [Worked example](#worked-example)
- [Step 3: pick three different flights](#step-3-pick-three-different-flights)
- [Step 4: explain the picks](#step-4-explain-the-picks)
- [Reading the traveller's note](#reading-the-travellers-note)
- [Guard rails around the LLM](#guard-rails-around-the-llm)
- [When things are offline](#when-things-are-offline)
- [Changing the behaviour](#changing-the-behaviour)
- [Where the code is](#where-the-code-is)

---

## The idea in one paragraph

Prices and durations are numbers, so arithmetic decides which flight is cheapest, which is fastest and which has the best balance. That part is **deterministic**: the same flights always give the same answer, and it can be checked by hand. A language model is optional and is used only for what language models are good at: reading a sentence such as "morning, non-stop, under six thousand" and writing a friendly reason. It is never trusted with a number. This is usually called a **hybrid** approach.

```
flights + preferences + optional note
        │
        ▼
 parse the note ──► merge with the form's preferences
        │
        ▼
 validate flights ──► filter by hard limits ──► score ──► pick three
        │
        ▼
 LLM configured?  ── no ──► template reasons          engine = DETERMINISTIC
        │ yes
        ▼
 LLM writes reasons, may swap "best overall"
        │
        ▼
 validate the reply ── anything wrong ──► template     engine = LLM (or DETERMINISTIC on failure)
```

---

## Step 1: validate and filter

**Validate.** Each flight must have an id, a positive price, a positive duration and a non-negative number of stops. A malformed record is skipped and counted in the notes; it does not fail the search. Duplicate ids keep the first.

**Filter.** Three preferences are hard limits:

| Preference | Keeps flights where |
|---|---|
| `nonStopOnly` | `stops` is 0 |
| `maxPrice` | `price` is at most the limit |
| `maxDurationMinutes` | `durationMinutes` is at most the limit |

If **no** flight passes, the limits are dropped and a note says: "No flight met every preference, so these are the closest options from the full list." A search with flights never comes back empty-handed.

---

## Step 2: score every flight

Each remaining flight gets a score between 0 and 1.

```
score = w_price × priceScore + w_duration × durationScore + w_stops × stopsScore  (+ departure bonus)
```

| Part | How it is calculated |
|---|---|
| `priceScore` | `(highestPrice − price) / (highestPrice − lowestPrice)`. The cheapest flight scores 1, the dearest 0. |
| `durationScore` | The same idea with journey time. The shortest scores 1. |
| `stopsScore` | 1 for non-stop, 0.5 for one stop, 0 for two or more. |
| Departure bonus | +0.08 when the flight leaves in the traveller's preferred part of the day. The total is capped at 1. |

Scores are relative to the flights in **this** search, which is what makes a ₹4,200 fare "cheap" on one route and "expensive" on another.

**Weights** depend on what the traveller said matters most:

| Priority | Price | Duration | Stops |
|---|---|---|---|
| `BALANCED` (default) | 0.50 | 0.35 | 0.15 |
| `CHEAPEST` | 0.70 | 0.20 | 0.10 |
| `FASTEST` | 0.25 | 0.60 | 0.15 |

The `BALANCED` weights come from `WEIGHT_PRICE`, `WEIGHT_DURATION` and `WEIGHT_STOPS` in `.env`.

**Parts of the day** (India time): morning 05:00 to 11:59, afternoon 12:00 to 16:59, evening 17:00 to 20:59, night 21:00 to 04:59.

---

## Worked example

Four flights, default weights. These numbers are the real output of the engine.

| Flight | Fare | Journey | Stops | priceScore | durationScore | stopsScore | **Score** |
|---|---|---|---|---|---|---|---|
| F1 | ₹4,200 | 1h 30m | 0 | 0.767 | 0.800 | 1.0 | **0.8133** |
| F2 | ₹3,500 | 2h 30m | 1 | 1.000 | 0.000 | 0.5 | **0.5750** |
| F3 | ₹6,500 | 1h 15m | 0 | 0.000 | 1.000 | 1.0 | **0.5000** |
| F4 | ₹5,200 | 1h 35m | 0 | 0.433 | 0.733 | 1.0 | **0.6233** |

Checking F1 by hand:

```
priceScore    = (6500 − 4200) / (6500 − 3500) = 0.767
durationScore = (150 − 90) / (150 − 75)       = 0.800
stopsScore    = 1.0 (non-stop)

score = 0.50 × 0.767 + 0.35 × 0.800 + 0.15 × 1.0 = 0.383 + 0.280 + 0.150 = 0.813
```

Result:

| Category | Flight | Template reason |
|---|---|---|
| Best overall | F1 | Strongest balance of fare, journey time and stops (score 0.81 out of 1): ₹4,200, 1h 30m, non-stop. |
| Cheapest | F2 | Lowest fare of the 4 flights compared: ₹3,500, about ₹1,350 below the average. The journey takes 2h 30m, 1 stop. |
| Fastest | F3 | Shortest journey of the 4 flights compared: 1h 15m, non-stop, about 27m quicker than the average. The fare is ₹6,500. |

F1 is neither the cheapest nor the fastest, yet it is the best compromise: ₹2,300 less than the fastest flight for 15 more minutes.

---

## Step 3: pick three different flights

1. **Cheapest** is always the true lowest fare.
2. **Fastest** is the shortest journey that is not already taken.
3. **Best overall** is the highest score that is not already taken.

The same flight is never shown twice. If the cheapest flight is also the quickest, the next quickest takes the "fastest" label and its reason says so. With fewer than three flights, fewer picks are returned.

---

## Step 4: explain the picks

**Without an LLM** (`LLM_PROVIDER=none`, the default), reasons are built from templates filled with the real numbers, as in the example above. Nothing is invented because nothing is generated.

**With an LLM**, the service sends it the shortlist (the three picks plus the eight best-scoring flights) with their scores, the traveller's preferences and their note, and asks for JSON:

```json
{ "recommendations": [ { "flightId": "...", "category": "CHEAPEST|FASTEST|BEST_OVERALL", "reason": "..." } ] }
```

The LLM may write all three reasons and may choose a different "best overall" from the shortlist if it suits the traveller's note better. It may not change the cheapest or the fastest.

---

## Reading the traveller's note

The search form has an optional free-text box. The parser in `preferences.py` turns it into the same structured preferences the form produces. Real examples:

| The traveller writes | Understood as |
|---|---|
| cheap morning flight | Lowest fare matters most; morning departure preferred |
| non-stop under 3 hours, budget 6k | Journey no longer than 3h 00m; fare up to ₹6,000; non-stop only |
| fastest evening flight under Rs 7,000 | Fare up to ₹7,000; shortest journey matters most; evening departure preferred |

What was understood is shown back to the traveller on the results page ("From your note we understood: ..."), so a misreading is visible instead of silent.

The rules are regular expressions, so they are predictable but limited. For example, "two and a half hours max" is not recognised as a duration limit, because the rule expects a cue such as "under" or "less than" before the number. When an LLM is configured it is tried first for this step, with the rules as the fallback.

**Merging.** Limits typed into the form win over limits found in the note. A priority found in the note applies only when the form was left on "balanced".

---

## Guard rails around the LLM

The LLM's reply is treated as untrusted input.

| Check | What happens on failure |
|---|---|
| The reply must contain a JSON object that matches the schema (1 to 3 items; each reason 8 to 400 characters) | The whole reply is discarded; templates are used |
| Every `flightId` must be one that was sent | That item is ignored |
| For cheapest and fastest, the flight must be the one the arithmetic chose | That item is ignored |
| "Best overall" must differ from the other two | That item is ignored |
| Every number of 500 or more in a reason must be a real fare from the search | The reason is replaced by the template |
| The call must finish within `LLM_TIMEOUT_SECONDS` (12 by default) | Templates are used |

The user backend then checks the service's reply again: each recommended id must belong to this search and each category may appear once. Every price, time and airline shown on screen comes from the backend's own stored offer, not from the model's text.

Only flight facts are sent to the LLM: ids, prices, durations, stops, departure hour, airline, flight number, baggage. No names, emails, phone numbers or account ids.

---

## When things are offline

| What is unavailable | What the traveller gets | `engine` label |
|---|---|---|
| Nothing | LLM-written reasons | `LLM` |
| The LLM (no key, timeout, bad reply) | Formula picks with template reasons | `DETERMINISTIC` |
| The whole AI service | The user backend applies the same formula itself (`fallbackRanking.service.js`); the free-text note is not read, and the page says so | `LOCAL_FALLBACK` |
| No flights were found | An empty result | `NONE` |

The results page states which of these happened, so the traveller always knows how the picks were made.

---

## Changing the behaviour

| To change | Edit |
|---|---|
| The balanced weights | `WEIGHT_PRICE`, `WEIGHT_DURATION`, `WEIGHT_STOPS` in `.env` |
| The cheapest-first or fastest-first weights | `weights_for()` in `app/ranking.py` (and `WEIGHTS` in the backend's `fallbackRanking.service.js`, to keep the two in step) |
| The departure bonus or the parts of the day | `DEPARTURE_BONUS`, `WINDOW_HOURS` in `app/ranking.py` |
| What the text parser understands | The regular expressions at the top of `app/preferences.py` |
| The LLM's instructions | `LLM_SYSTEM` in `app/ranking.py`, `PARSE_SYSTEM` in `app/preferences.py` |
| The LLM provider or model | `LLM_PROVIDER`, `LLM_MODEL` and the matching API key in `.env` |

After a change, run `npm run test:ai`.

---

## Where the code is

| File | Contents |
|---|---|
| `services/ai-recommendation/app/main.py` | The FastAPI routes |
| `app/ranking.py` | Validation, filters, scoring, the three picks, templates, LLM refinement |
| `app/preferences.py` | The text parser and the merge rules |
| `app/llm.py` | A small client for Anthropic and OpenAI-compatible APIs, using only Python's standard library |
| `app/schemas.py` | Pydantic models for every request and reply |
| `app/config.py` | Settings read from the root `.env` |
| `tests/test_ranking.py` | 15 tests for the above |
| `apps/user-backend/src/integrations/ai-service/client.js` | The backend's client, which re-validates the reply |
| `apps/user-backend/src/services/fallbackRanking.service.js` | The formula used when the service is offline |

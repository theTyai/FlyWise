# Testing

What is tested, how to run it, and what to check by hand.

- [Running the tests](#running-the-tests)
- [What each test file proves](#what-each-test-file-proves)
- [The database integration tests](#the-database-integration-tests)
- [Manual test checklist](#manual-test-checklist)
- [Test status of this delivery](#test-status-of-this-delivery)

---

## Running the tests

```bash
npm test          # all JavaScript tests (shared, user backend, admin backend)
npm run test:ai   # the Python tests for the AI service

npm test -w @flywise/user-backend    # one package only
npm test -w @flywise/admin-backend
npm test -w @flywise/shared
```

The JavaScript tests use Node's built-in test runner (`node --test`), so there is no extra test framework to install. The Python tests use `pytest`.

None of the default tests need a database, a running server or the internet.

---

## What each test file proves

### `shared/tests/constants.test.js` (5 tests)

| Checks | Why it matters |
|---|---|
| The state machine allows only the documented moves | A request cannot jump from waiting to confirmed without allocation; reject and revoke cannot be confused |
| Terminal statuses have no way out | A rejected or cancelled booking can never come back to life |
| Every stored status has a label and a colour | No screen can show a raw internal name |
| Airport codes are unique and well-formed | The search form and the validators agree |
| Request sanitising, pagination and log redaction | `$` operators are stripped, page sizes are capped, passwords never reach the log |

### `apps/user-backend/tests/providers.test.js` (6 tests)

| Checks | Why it matters |
|---|---|
| The sample provider returns well-formed, labelled offers | Durations match the times, totals match per-passenger fares, keys are unique |
| The same route and date give the same flights | Two travellers compete for the same simulated seats, which makes the "last seat" demo possible |
| Duffel offers are converted to the internal shape | A second flight source fits without changing the rest of the system |
| Every supported airport pair produces flights; bad input produces none | No route in the search form leads to an empty or broken result |
| The offline fallback ranking picks correctly and never repeats a flight | Search still gives three sensible picks when the AI service is down |

### `apps/user-backend/tests/validators.test.js` (5 tests)

| Checks | Why it matters |
|---|---|
| Sign-up rejects a `role` field and short passwords | Nobody can register as an admin |
| Profile updates accept only name and phone | Email and account status cannot be changed through this route |
| Search rejects same-airport trips, past dates, unknown airports, more than 6 passengers, dates beyond 330 days | Bad input never reaches the provider |
| A booking request with a `price` or `status` field is rejected | The fare cannot be tampered with from the browser |
| A booking update must contain passengers or contact, and nothing else | |

### `apps/admin-backend/tests/validators.test.js` (4 tests)

| Checks | Why it matters |
|---|---|
| Reject and revoke need a reason of at least 5 characters | The traveller is always told why |
| The request list accepts only real statuses | |
| Inventory needs a valid flight number, different airports, 0 to 500 seats; `availableSeats` cannot be set directly | Seat counts change only through the allocation logic |
| Settings and account status accept only their documented values | |

### `services/ai-recommendation/tests/test_ranking.py` (15 tests)

| Checks | Why it matters |
|---|---|
| Cheapest and fastest are mathematically correct | The core promise |
| The three picks are always different flights | |
| Equal prices or durations do not divide by zero | |
| Invalid records are skipped, not fatal | One bad record from a provider cannot break a search |
| Fewer than three flights, and no flights at all | |
| Hard filters, and their relaxation when nothing passes | |
| Priority changes the weights; a preferred departure time earns a bonus | |
| The text parser, and that form fields win over the note | |
| An LLM reply with an invented flight id is rejected | |
| An LLM cannot change the cheapest flight or invent a price | |
| LLM garbage, or an LLM outage, falls back to the formula | |

---

## The database integration tests

`apps/admin-backend/tests/decisions.integration.test.js` contains the three most important tests in the project. They run the real decision code against a real MongoDB with **concurrent** calls:

1. **Two requests, one seat.** Both are confirmed at the same instant. Exactly one succeeds, the other gets `NO_SEATS`, and the flight ends with 0 seats, never −1.
2. **Five identical confirms.** Seats are taken once and exactly one allocation exists.
3. **The rules of reject and revoke.** A pending request cannot be revoked; a confirmed one cannot be rejected; revoking returns the seats exactly once.

They are **skipped by default** because they create and delete data. To run them, point them at a database whose name contains `test`:

```powershell
# Windows PowerShell
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/flywise_test"; npm test -w @flywise/admin-backend
```

```bash
# macOS / Linux
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/flywise_test npm test -w @flywise/admin-backend
```

The test database is dropped at the end. The tests refuse to run if the name does not contain `test`, so they cannot wipe your development data by accident.

---

## Manual test checklist

Work through this once after setup. It doubles as a script for a demonstration.

**Traveller app**

| # | Do this | Expect |
|---|---|---|
| 1 | Search Bhopal to Delhi, any future date | Three recommendations and a full list; a "sample fares" notice |
| 2 | Add the note "morning non-stop under 3 hours" and search | A line saying what was understood from the note |
| 3 | Search from an airport to the same airport | A clear validation message |
| 4 | Click "Request this flight" while signed out | Sent to sign-in, then back to the booking page |
| 5 | Register with a 5-character password | Rejected with a helpful message |
| 6 | Send a request without ticking the acknowledgement | Rejected |
| 7 | Send a valid request | Trip page with "Waiting for review"; a notification; it appears in My trips |
| 8 | Request the same flight again | "You already have an open request for this flight" |
| 9 | Edit the passenger's name on the waiting request | Saved; a history entry is added |
| 10 | Cancel a request | Status "Cancelled"; it moves to "Past and closed" |
| 11 | Open another traveller's trip URL | "We could not find this booking" |

**Desk app**

| # | Do this | Expect |
|---|---|---|
| 12 | Sign in with a traveller's email and password | "Email or password is incorrect" |
| 13 | Sign in as the admin | The overview with totals and charts |
| 14 | Keep the desk open and send a request from the traveller app | A toast appears and the waiting count rises, with no refresh |
| 15 | Open a waiting request and confirm | Status "Confirmed"; free seats drop by the passenger count; an audit entry appears |
| 16 | Watch the traveller's trip page while confirming | It changes to "Confirmed" by itself |
| 17 | Reject a request with a 2-character reason | Blocked; a longer reason is required |
| 18 | Revoke a confirmed booking | Status "Revoked"; seats return; the traveller sees the reason |
| 19 | The last seat: see [demo-guide.md](demo-guide.md#the-last-seat) | The second confirm is refused |
| 20 | Lower a flight's seat total below its allocated seats | Refused with an explanation |
| 21 | Suspend a traveller, then use the traveller app as them | Their requests are refused with "This account is suspended", and they cannot sign in again |
| 22 | Open the audit log | Every action above is listed, newest first |

**Resilience**

| # | Do this | Expect |
|---|---|---|
| 23 | Stop the AI service (`Ctrl+C`, then `npm run dev:node`) and search | Results still appear, with a note that the AI service was offline |
| 24 | Stop the user backend and use the traveller app | "Cannot reach the FlyWise server", not a blank page |

---

## Test status of this delivery

| Item | Status |
|---|---|
| `shared` tests (5) | Pass |
| User backend tests (11) | Pass |
| Admin backend validator tests (4) | Pass |
| AI service tests (15) | Pass |
| Admin backend integration tests (3) | **Not run**: no MongoDB was available where the project was assembled |
| Both frontends rendered and clicked through in a headless browser, against sample data | Done |
| Both backends started against a real MongoDB | **Not done**: run the manual checklist above |
| Docker build | **Not done** |

The validator tests were run with the real `zod` library. The one function they need from the database layer (checking that an id looks like an ObjectId) was stood in for during that run, so run `npm test` once on your machine to confirm with the real packages.

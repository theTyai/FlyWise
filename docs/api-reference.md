# API reference

Every endpoint of the three services.

- [Conventions](#conventions)
- [User backend](#user-backend-httplocalhost5000) (travellers)
- [Admin backend](#admin-backend-httplocalhost5001) (desk)
- [AI recommendation service](#ai-recommendation-service-httplocalhost8000)
- [WebSocket events](#websocket-events)
- [Error codes](#error-codes)

---

## Conventions

**Envelope.** Both backends answer in one format.

```json
{ "success": true, "data": { "...": "..." } }
{ "success": true, "data": { "bookings": [] }, "meta": { "page": 1, "limit": 20, "total": 42, "pages": 3 } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Enter a valid email address",
                               "details": [ { "field": "email", "message": "Enter a valid email address" } ] } }
```

**Authentication.** Send `Authorization: Bearer <token>`. Traveller and admin tokens are not interchangeable.

**Validation.** Bodies are checked against a schema. Unknown fields are rejected on most endpoints, and the first problem becomes `error.message`; all problems are listed in `error.details`.

**Pagination.** List endpoints on the admin backend accept `?page=1&limit=20` (limit at most 100) and answer with `meta`.

**Ids** are 24-character MongoDB ObjectIds. **Dates** are ISO 8601 strings. **Money** is a number in the offer's currency (INR for sample data).

In the tables below, **Auth** is `none`, `traveller`, `admin`, or `admin:PERMISSION`.

---

## User backend (http://localhost:5000)

All routes are under `/api/v1` unless shown otherwise.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Service state, database connection, flight provider, whether the AI service is reachable |

### Authentication

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | none | `name`, `email`, `password` (8+ characters), `phone` (optional) | `user`, `accessToken`, `refreshToken` (201) |
| POST | `/auth/login` | none | `email`, `password` | `user`, `accessToken`, `refreshToken` |
| POST | `/auth/refresh` | none | `refreshToken` | A new `accessToken` and `refreshToken`; the old refresh token stops working |
| POST | `/auth/logout` | traveller | none | `{ "signedOut": true }` |

Limited to 40 requests per 15 minutes per IP address.

```json
// POST /api/v1/auth/login
{ "email": "rahul@demo.flywise", "password": "Traveller@123" }

// 200
{ "success": true, "data": {
  "user": { "id": "...", "name": "Rahul Sharma", "email": "rahul@demo.flywise", "phone": "9876543210",
            "role": "USER", "accountStatus": "ACTIVE", "createdAt": "2026-11-16T04:10:00.000Z" },
  "accessToken": "eyJ...", "refreshToken": "eyJ..." } }
```

### Profile

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/users/me` | traveller | none | `user` |
| PATCH | `/users/me` | traveller | `name` and/or `phone` | `user` |

### Flights

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/flights/airports` | none | The 24 supported airports (`code`, `city`, `name`) |
| POST | `/flights/search` | optional | Run a search. Returns `search`, `offers`, `recommendations` (201) |
| GET | `/flights/search/:id` | none | A saved search with its offers and picks |
| GET | `/flights/recommendations/:id` | none | Only the engine, notes and picks of a saved search |
| GET | `/flights/offers/:id` | none | One offer, its search, and its recommendation if it was a pick |

```json
// POST /api/v1/flights/search
{
  "origin": "BHO", "destination": "DEL", "departureDate": "2026-12-05",
  "passengers": 1, "cabinClass": "ECONOMY",
  "preferences": { "priority": "BALANCED", "nonStopOnly": false, "maxPrice": 6000,
                   "maxDurationMinutes": 180, "departurePreference": "MORNING" },
  "naturalLanguage": "morning flight, no more than three hours"
}
```

| Field | Rules |
|---|---|
| `origin`, `destination` | Supported airport codes; must differ |
| `departureDate` | `YYYY-MM-DD`, today or later (India time), at most 330 days ahead |
| `passengers` | 1 to 6, default 1 |
| `cabinClass` | `ECONOMY`, `PREMIUM_ECONOMY`, `BUSINESS`; default `ECONOMY` |
| `preferences.priority` | `BALANCED`, `CHEAPEST`, `FASTEST`; default `BALANCED` |
| `preferences.*` | `maxPrice`, `nonStopOnly`, `maxDurationMinutes`, `departurePreference` (`MORNING`, `AFTERNOON`, `EVENING`, `NIGHT`) are optional |
| `naturalLanguage` | Optional, up to 300 characters |

```json
// 201 (shortened)
{ "success": true, "data": {
  "search": { "id": "...", "origin": "BHO", "destination": "DEL", "departureDate": "2026-12-05",
              "provider": "MOCK", "providerMode": "MOCK", "engine": "DETERMINISTIC",
              "engineNotes": ["From your note we understood: Morning departure preferred; Journey no longer than 3h 00m."],
              "offerCount": 12 },
  "offers": [ { "id": "...", "airline": "IndiGo", "flightNumber": "6E-2031", "origin": "BHO", "destination": "DEL",
                "departureTime": "2026-12-05T00:40:00.000Z", "arrivalTime": "2026-12-05T02:15:00.000Z",
                "durationMinutes": 95, "stops": 0, "cabinClass": "ECONOMY",
                "baggage": { "cabin": "7 kg", "checked": "15 kg" }, "currency": "INR",
                "pricePerPassenger": 4849, "passengerCount": 1, "price": 4849,
                "expiresAt": "2026-11-16T05:00:00.000Z", "expired": false, "score": 0.86 } ],
  "recommendations": [ { "offerId": "...", "category": "BEST_OVERALL", "reason": "...", "score": 0.86 },
                       { "offerId": "...", "category": "CHEAPEST", "reason": "...", "score": 0.62 },
                       { "offerId": "...", "category": "FASTEST", "reason": "...", "score": 0.71 } ] } }
```

`search.engine` says who ranked: `LLM`, `DETERMINISTIC` (the AI service's formula), `LOCAL_FALLBACK` (the AI service was offline) or `NONE` (no flights found).

### Booking requests

All require a signed-in traveller, and a traveller can only reach their own requests.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/bookings` | `offerId`, `passengers[]`, `contact`, `acknowledgeSimulated: true` | `booking` (201) |
| GET | `/bookings` | Optional `?status=CONFIRMED` | `bookings[]`, newest first |
| GET | `/bookings/:id` | none | `booking` |
| PATCH | `/bookings/:id` | `passengers[]` and/or `contact` | `booking`. Only while waiting for review |
| POST | `/bookings/:id/cancel` | Optional `reason` | `booking`, plus `alreadyCancelled: true` when repeated |

```json
// POST /api/v1/bookings
{
  "offerId": "6741f0c2a1b2c3d4e5f60718",
  "passengers": [ { "firstName": "Rahul", "lastName": "Sharma", "dateOfBirth": "2003-05-10", "gender": "MALE" } ],
  "contact": { "email": "rahul@example.com", "phone": "9876543210" },
  "acknowledgeSimulated": true
}
```

There is no `price` field: the fare is copied from the stored offer. Sending one is a validation error.

```json
// booking (shortened)
{ "id": "...", "bookingReference": "FWB-2026-00014", "status": "PENDING_ADMIN_APPROVAL", "inventoryMode": "SIMULATED",
  "recommendationCategory": "BEST_OVERALL",
  "flight": { "airline": "IndiGo", "flightNumber": "6E-2031", "origin": "BHO", "destination": "DEL", "...": "..." },
  "passengers": [ { "firstName": "Rahul", "lastName": "Sharma", "dateOfBirth": "2003-05-10", "gender": "MALE" } ],
  "contact": { "email": "rahul@example.com", "phone": "9876543210" },
  "pricing": { "amount": 4849, "currency": "INR", "perPassenger": 4849, "passengerCount": 1 },
  "adminDecision": null, "cancellation": null,
  "history": [ { "status": "PENDING_ADMIN_APPROVAL", "at": "...", "actor": "USER", "note": "Booking request sent" } ],
  "createdAt": "...", "updatedAt": "..." }
```

### Notifications

| Method | Path | Returns |
|---|---|---|
| GET | `/notifications` | The latest 60 `notifications[]` and `unreadCount` |
| PATCH | `/notifications/:id/read` | `notification` |
| POST | `/notifications/read-all` | `{ "unreadCount": 0 }` |

### Internal

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/internal/events` | `x-internal-key` header | Called by the admin backend to push a notification and a status change to one traveller's sockets |

---

## Admin backend (http://localhost:5001)

All routes are under `/api/v1/admin` unless shown otherwise. Limited to 900 requests per 15 minutes per IP address; sign-in to 30.

### Health and authentication

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/health` | none | none | Service state and database connection |
| POST | `/auth/login` | none | `email`, `password` | `admin`, `accessToken` (valid 8 hours) |
| GET | `/auth/me` | admin | none | `admin` (`id`, `name`, `email`, `role`, `permissions[]`) |

There is no registration endpoint.

### Dashboard

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/dashboard` | admin:VIEW_REQUESTS | See below |

```json
{ "totals": { "total": 11, "pending": 3, "confirmed": 5, "rejected": 1, "cancelled": 1, "revoked": 1, "failed": 0, "travellers": 3 },
  "approvalRate": 86,
  "confirmedValue": 25295,
  "seats": { "available": 56, "total": 61, "flights": 6 },
  "statusCounts": { "PENDING_ADMIN_APPROVAL": 3, "CONFIRMED": 5, "...": 0 },
  "requestsPerDay": [ { "date": "2026-11-03", "count": 0 }, "... 14 days ..." ],
  "topRoutes": [ { "origin": "BHO", "destination": "DEL", "count": 2 } ],
  "topAirlines": [ { "airline": "IndiGo", "count": 4 } ],
  "oldestPending": [ { "id": "...", "bookingReference": "FWB-2026-00009", "traveller": "Vikram Singh", "...": "..." } ] }
```

`approvalRate` is the share of decided requests that were approved (confirmed or later revoked), or `null` when nothing has been decided.

### Booking requests

| Method | Path | Auth | Body or query | Returns |
|---|---|---|---|---|
| GET | `/bookings` | admin:VIEW_REQUESTS | `?status=&q=&page=&limit=` | `bookings[]` summaries + `meta` |
| GET | `/bookings/:id` | admin:VIEW_REQUESTS | none | `booking`, `inventory`, `allocation`, `audit[]` |
| POST | `/bookings/:id/confirm` | admin:APPROVE_BOOKINGS | Optional `Idempotency-Key` header | The detail again, plus `alreadyConfirmed` |
| POST | `/bookings/:id/reject` | admin:REJECT_BOOKINGS | `reason` (5 to 300 characters) | The detail again |
| POST | `/bookings/:id/revoke` | admin:REVOKE_BOOKINGS | `reason` (5 to 300 characters) | The detail again |

`q` matches a booking reference, flight number, airline, airport code, or a traveller's name or email.

```json
// GET /api/v1/admin/bookings/:id (shortened)
{ "booking": { "id": "...", "bookingReference": "FWB-2026-00014", "status": "PENDING_ADMIN_APPROVAL",
               "traveller": { "id": "...", "name": "Rahul Sharma", "email": "rahul@demo.flywise", "phone": "9876543210" },
               "passengerCount": 1, "amount": 4849, "currency": "INR",
               "flight": { "...": "..." }, "passengers": [], "contact": {}, "pricing": {},
               "adminDecision": null, "cancellation": null, "history": [] },
  "inventory": { "id": "...", "flightKey": "6E-2031_2026-11-25", "totalSeats": 12, "availableSeats": 10, "inventoryMode": "SIMULATED" },
  "allocation": null,
  "audit": [] }
```

### Seat inventory

| Method | Path | Auth | Body or query | Returns |
|---|---|---|---|---|
| GET | `/inventory` | admin:MANAGE_INVENTORY | `?q=&page=&limit=` | `inventory[]` + `meta`, ordered by departure |
| POST | `/inventory` | admin:MANAGE_INVENTORY | `flightNumber` (like `6E-201`), `origin`, `destination`, `date`, `totalSeats` (0 to 500), `airline` (optional) | `inventory` (201) |
| PATCH | `/inventory/:id` | admin:MANAGE_INVENTORY | `totalSeats` | `inventory` |

Changing `totalSeats` moves `availableSeats` by the same amount. The total cannot go below the seats already allocated (`INVENTORY_CONFLICT`).

### Travellers

| Method | Path | Auth | Body or query | Returns |
|---|---|---|---|---|
| GET | `/users` | admin:MANAGE_USERS | `?q=&page=&limit=` | `users[]` (with a `bookings` count each) + `meta` |
| PATCH | `/users/:id/status` | admin:MANAGE_USERS | `accountStatus`: `ACTIVE` or `SUSPENDED` | `user` (`id`, `accountStatus`) |

Suspending also invalidates the traveller's refresh token.

### Audit log

| Method | Path | Auth | Query | Returns |
|---|---|---|---|---|
| GET | `/audit-logs` | admin:VIEW_AUDIT_LOGS | `?q=&page=&limit=` (default 25 per page) | `logs[]` + `meta`, newest first |

### Settings

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/settings` | admin:MANAGE_SETTINGS | none | `settings` (`defaultSimulatedSeats`, `updatedAt`) |
| PATCH | `/settings` | admin:MANAGE_SETTINGS | `defaultSimulatedSeats` (0 to 500) | `settings` |
| GET | `/settings/services` | admin:MANAGE_SETTINGS | none | `services[]`: name, `up` or `down`, detail |

### Internal

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/internal/events` | `x-internal-key` header | Called by the user backend (`booking:new`, `booking:update`) so open desk tabs refresh |

---

## AI recommendation service (http://localhost:8000)

FastAPI also serves interactive documentation at http://localhost:8000/docs while the service is running.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | `status`, `service`, and the LLM configuration |
| GET | `/models/status` | none | LLM provider, model, and the active ranking weights |
| POST | `/recommend` | `x-internal-key` | Rank flights and return up to three recommendations |
| POST | `/parse-preferences` | `x-internal-key` | Turn a sentence into structured preferences |
| POST | `/explain` | `x-internal-key` | Write the reason for one flight in one category |

```json
// POST /recommend
{
  "flights": [
    { "id": "F1", "price": 4200, "durationMinutes": 90,  "stops": 0, "departureHour": 8,  "airline": "IndiGo" },
    { "id": "F2", "price": 3500, "durationMinutes": 150, "stops": 1, "departureHour": 14 },
    { "id": "F3", "price": 6500, "durationMinutes": 75,  "stops": 0, "departureHour": 19 }
  ],
  "preferences": { "priority": "BALANCED" },
  "naturalLanguage": "cheap morning flight",
  "currency": "INR"
}

// 200
{
  "engine": "DETERMINISTIC", "model": null,
  "preferences": { "priority": "CHEAPEST", "maxPrice": null, "nonStopOnly": false,
                   "maxDurationMinutes": null, "departurePreference": "MORNING" },
  "weights": { "price": 0.7, "duration": 0.2, "stops": 0.1 },
  "notes": ["From your note we understood: Lowest fare matters most; Morning departure preferred."],
  "recommendations": [ { "flightId": "F1", "category": "BEST_OVERALL", "reason": "...", "score": 0.83 },
                       { "flightId": "F2", "category": "CHEAPEST", "reason": "...", "score": 0.75 },
                       { "flightId": "F3", "category": "FASTEST", "reason": "...", "score": 0.3 } ],
  "scores": { "F1": 0.83, "F2": 0.75, "F3": 0.3 }
}
```

The numbers in this example are illustrative. A malformed flight record is skipped and mentioned in `notes`; it does not fail the whole request. How the scores are computed is in [ai-recommendation.md](ai-recommendation.md).

---

## WebSocket events

Connect with Socket.IO and pass the token: `io(origin, { auth: { token } })`.

| Server | Event | Payload | Sent to |
|---|---|---|---|
| User backend | `notification` | A notification object | The traveller it belongs to |
| User backend | `booking:update` | `{ bookingId, status }` | The traveller who owns the booking |
| Admin backend | `booking:new` | `{ bookingId, bookingReference, status }` | Every connected admin |
| Admin backend | `booking:update` | `{ bookingId, bookingReference, status }` | Every connected admin |

---

## Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | The body or query did not match the schema; see `details` |
| 400 | `BAD_JSON` | The body is not valid JSON |
| 400 | `BAD_ID` | An id in the URL is not a valid ObjectId |
| 400 | `PASSENGER_COUNT_MISMATCH` | Passenger count differs from the fare, or was changed in an edit |
| 401 | `UNAUTHENTICATED` | No token was sent |
| 401 | `TOKEN_INVALID` | The access token is expired or invalid (the traveller app then tries its refresh token) |
| 401 | `REFRESH_INVALID` | The refresh token is expired, replaced or revoked |
| 401 | `BAD_CREDENTIALS` | Wrong email or password |
| 401 | `INTERNAL_KEY_INVALID` | Wrong or missing `x-internal-key` |
| 403 | `ACCOUNT_SUSPENDED` | The account is suspended |
| 403 | `FORBIDDEN` | Not an admin, or the admin lacks the required permission |
| 404 | `NOT_FOUND` | No such route |
| 404 | `BOOKING_NOT_FOUND`, `OFFER_NOT_FOUND`, `SEARCH_NOT_FOUND`, `NOTIFICATION_NOT_FOUND`, `INVENTORY_NOT_FOUND`, `USER_NOT_FOUND` | The item does not exist, or does not belong to the caller |
| 409 | `EMAIL_TAKEN` | An account with this email exists |
| 409 | `DUPLICATE_REQUEST` | The traveller already has an open request for this flight |
| 409 | `NOT_EDITABLE` | The request is no longer waiting for review |
| 409 | `NOT_CANCELLABLE` | The booking is in a status that cannot be cancelled |
| 409 | `INVALID_TRANSITION` | The decision is not allowed from the current status |
| 409 | `IN_PROGRESS` | Another confirmation of this request is running |
| 409 | `NO_SEATS` | Not enough simulated seats to confirm |
| 409 | `INVENTORY_EXISTS` | Inventory for this flight and date already exists |
| 409 | `INVENTORY_CONFLICT` | The new total is below the seats already allocated |
| 410 | `OFFER_EXPIRED` | The fare was held for 30 minutes and has expired |
| 429 | `RATE_LIMITED` | Too many requests from this address |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `FLIGHT_PROVIDER_UNAVAILABLE`, `FLIGHT_PROVIDER_ERROR` | The live flight provider failed |

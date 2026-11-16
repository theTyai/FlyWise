# Limitations and future work

An honest list of what FlyWise AI does not do, and where it could go next.

## What this project is not

- **Not a ticketing system.** No airline is contacted when a booking is confirmed. "Confirmed" means an admin approved the request against FlyWise's own simulated seat count.
- **No payments.** Nothing is charged and no card details are collected.
- **Sample flights by default.** With `FLIGHT_PROVIDER=mock`, flight numbers, schedules and fares are generated. Airline names are real so the screens look familiar; nothing else is.

## Known limitations

| Area | Limitation |
|---|---|
| Verification | The backends were restructured without being run against a real MongoDB. See the README's section on what has and has not been tested. |
| Live flight data | The Duffel provider implements search only, was written from documentation, and has never been run with a real token. |
| Trips | One-way only. No return or multi-city searches. |
| Routes | 24 Indian airports, listed in `shared/constants.js`. |
| Seats | A count per flight per day. No cabin split, seat map or seat numbers. |
| Fares | Sample fares are fixed once generated for a search and held for 30 minutes. There is no re-pricing step; the `PRICE_REVALIDATION` status is reserved for it. |
| Admin accounts | One admin is created from `.env`. There is no screen to add admins or edit their permissions, although the permission checks are in place on every endpoint. |
| Passwords | No "forgot password" flow and no email verification. |
| Notifications | In-app only. No email or SMS. |
| Sessions | Traveller tokens are kept in the browser's `localStorage`. This is common for projects of this size; a production system would prefer `httpOnly` cookies. |
| Text parser | The rule-based parser understands common phrasings in English only. It reports what it understood so a miss is visible. |
| Time zones | Everything is shown in India Standard Time, which suits domestic routes only. |
| Rate limiting | Counted in memory per server process. Several server instances would need a shared store such as Redis. |
| Live updates | The two backends notify each other over HTTP. With several instances of each, Socket.IO would need a shared adapter. |
| Docker | The Docker files are new and have not been built. |
| Frontend tests | The interfaces were checked by rendering and clicking through them, not by an automated test suite. |

## Future work

**Closer to a real product**

- Book through a live provider's order API in test mode, behind the existing provider interface ("Mode B" in the original blueprint), using the reserved `PRICE_REVALIDATION` step to re-check the fare at approval time.
- A payment step in a provider's sandbox, with refunds on revoke.
- Return trips and multi-passenger fare types (adult, child, infant).
- Email notifications and a printable itinerary.

**Smarter recommendations**

- Learn the weights from which recommendation travellers actually choose, instead of fixing them at 50 / 35 / 15.
- More factors: baggage allowance, layover length, airline punctuality, time of arrival.
- Fare trend hints ("prices on this route usually rise in the last week").
- A conversational search that asks a follow-up question when the note is ambiguous.

**Desk and operations**

- Admin management with per-person permissions.
- Bulk decisions, and rules that auto-approve low-risk requests while leaving the rest to a person.
- Service-level tracking: how long requests wait, with alerts when the queue grows.
- Export of the audit log.

**Engineering**

- End-to-end tests with Playwright covering the manual checklist in [testing.md](testing.md).
- Continuous integration that runs every test, including the database tests, on each change.
- A shared Socket.IO adapter and rate-limit store so each service can run as several instances.
- Structured logging and basic metrics.
- TypeScript, sharing types between the backends and the frontends.

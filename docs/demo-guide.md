# Demo guide

A ten-minute walkthrough for a presentation or viva, with the points worth saying out loud.

- [Before you start](#before-you-start)
- [1. The problem and the idea (1 minute)](#1-the-problem-and-the-idea-1-minute)
- [2. Search and recommendations (2 minutes)](#2-search-and-recommendations-2-minutes)
- [3. Sending a booking request (1 minute)](#3-sending-a-booking-request-1-minute)
- [4. The desk decides, live (2 minutes)](#4-the-desk-decides-live-2-minutes)
- [5. The last seat (2 minutes)](#the-last-seat)
- [6. Reject, revoke and the audit log (1 minute)](#6-reject-revoke-and-the-audit-log-1-minute)
- [7. What happens when the AI is offline (1 minute)](#7-what-happens-when-the-ai-is-offline-1-minute)
- [Questions you may be asked](#questions-you-may-be-asked)

---

## Before you start

1. Start from clean data so the numbers match this guide:
   ```
   npm run db:reset -- --yes
   npm run dev
   npm run seed:demo        (in a second terminal, once the first shows the servers are up)
   ```
2. Run `npm run check` and confirm everything is up.
3. Arrange two browser windows side by side:
   - **Left**: http://localhost:5173, signed in as `rahul@demo.flywise` / `Traveller@123`
   - **Right**: http://localhost:5174, signed in as `admin@flywise.local` / `ChangeMe!2026`
4. For the last-seat part you need a second traveller. Open a **private / incognito** window at http://localhost:5173 and sign in as `ananya@demo.flywise` / `Traveller@123`.

The seed leaves three requests waiting, two of which (Rahul's and Ananya's) are for the same Delhi to Bengaluru flight, `SG-4410`, which has **one** simulated seat.

---

## 1. The problem and the idea (1 minute)

> "Comparing flights means weighing price against time against stops. FlyWise does that weighing, explains its choice in a sentence, and then puts a human in the loop: a booking is a request that an admin approves against seat inventory."

Be clear early: **this is not a ticketing system.** Seats are simulated and no money moves. What is real is the engineering: the ranking, the approval workflow, the concurrency control, the live updates and the audit trail.

Show the README's table of five programs, or the diagram in [architecture.md](architecture.md).

---

## 2. Search and recommendations (2 minutes)

In the traveller window:

1. Search **Bhopal (BHO) to Delhi (DEL)** on a date about two weeks away.
2. Point at the three passes: **Best overall, Cheapest, Fastest**, each with a reason.
3. Point at the yellow notice: these are sample fares.
4. Click **Change search**, type the note **"cheap morning flight, non-stop"**, and search again. Show the line "From your note we understood: ...".

Say:

> "Cheapest and fastest are decided by arithmetic, never by a language model. Best overall is a weighted score: price 50%, journey time 35%, stops 15%. A language model can optionally write the explanations, but any reply that mentions a flight or a fare we did not send is thrown away."

If asked to prove it, open [ai-recommendation.md](ai-recommendation.md#worked-example) and do the F1 calculation by hand.

---

## 3. Sending a booking request (1 minute)

1. Click **Request this flight** on any pass.
2. Fill in date of birth and gender (the name is filled in from the profile), tick the acknowledgement, and send.
3. You land on the trip page: reference `FWB-2026-...`, status **Waiting for review**, a progress line.

Say:

> "The browser sent only the offer id and the passenger. The fare was copied from the server's own saved offer, so editing the request cannot change the price."

**Watch the right-hand window as you click send.** A toast appears on the desk and the waiting count goes up, with no refresh. That is the WebSocket channel.

---

## 4. The desk decides, live (2 minutes)

In the desk window:

1. Show the **Overview**: waiting count, totals, approval rate, the 14-day chart, requests by status.
2. Open **Booking requests** and click the request you just sent.
3. Point at the three panels: **Traveller**, **Flight**, **Decision**. The seat bar shows how many simulated seats are free and whether that is enough.
4. Click **Confirm booking**, read the dialog aloud, and confirm.

**Watch the left-hand window.** The traveller's page changes to **Confirmed** by itself and the bell shows a new notification.

Say:

> "Confirming does three things in order: it claims the request so no other admin can act on it, takes the seats with one atomic database update, and records the decision, an audit entry and a notification."

---

## The last seat

This is the strongest part of the demo. Flight `SG-4410` has one seat and two travellers want it.

1. On the desk, open **Seat inventory** and show `SG-4410`: **1 free of 1**.
2. Open **Booking requests**. Two waiting requests are for `SG-4410`: one from Rahul, one from Ananya.
3. Open Rahul's request and **confirm** it. The seat bar now shows **0 free**.
4. Open Ananya's request. The panel says there are not enough seats and the **Confirm** button is disabled.

Say:

> "The interface disables the button, but the real protection is on the server. The update that takes a seat says: subtract one only if at least one is available. MongoDB applies that as a single atomic step, so even if two admins clicked at the same instant, only one update can match."

To finish the story, either:

- **Reject** Ananya's request using the suggested reason "No simulated seats left on this flight." and show the reason arriving in Ananya's window; or
- Go to **Seat inventory**, raise `SG-4410` to 2 seats, return to the request and confirm it.

If asked how you know the simultaneous case works: the integration test `decisions.integration.test.js` fires both confirmations at once against a real database and asserts that exactly one succeeds. Run it beforehand (see [testing.md](testing.md#the-database-integration-tests)) so you can say you have seen it pass.

---

## 6. Reject, revoke and the audit log (1 minute)

1. Open a **Confirmed** booking and click **Revoke booking**. Choose "The airline cancelled this flight." and confirm. The seats return to inventory.
2. Open the **Audit log**. Every action from this demo is there: who, what, when, from which status to which, and why.

Say:

> "Reject and revoke are deliberately different. Reject is for a request that was never approved. Revoke withdraws something that was approved, and gives the seats back. The audit log can only be added to: there is no API to edit or delete an entry."

---

## 7. What happens when the AI is offline (1 minute)

1. Stop everything (`Ctrl+C`) and start without the AI service: `npm run dev:node`.
2. Search again in the traveller app.

Results still appear, with a note that the AI service was offline and the built-in formula was used.

Say:

> "The AI service is a separate program. If it is down, the backend applies the same formula itself and tells the traveller. A recommendation feature should never take the whole product down with it."

---

## Questions you may be asked

**Is the AI just an API call to a chatbot?**
No. The ranking is a deterministic scoring formula that can be checked by hand. An LLM is optional and limited to reading the traveller's note and writing explanations, with its output validated. The project runs fully without any LLM key.

**Why MongoDB and not a relational database?**
A booking is naturally one document: a flight snapshot, a list of passengers, a history. The safety-critical steps are single-document updates, which MongoDB makes atomic, so no multi-document transaction is needed.

**What stops overbooking?**
A conditional update ("decrement only if enough seats remain") plus a unique index that allows one allocation per booking. See [workflows.md](workflows.md#how-races-are-prevented).

**What stops a user from becoming an admin?**
Admins are a separate collection, signed in through a separate server with a separate secret. The sign-up endpoint rejects any field it does not expect, including `role`.

**Why two backends?**
Separation of privilege. The code that can confirm a booking does not exist in the process that the public talks to. See [architecture.md](architecture.md#why-five-programs).

**Are the flights real?**
By default they are generated sample data, labelled as such. A provider for live offers (Duffel) is included behind the same interface but has not been exercised with a real token. Seats and confirmations are simulated in either case.

**How do updates appear without refreshing?**
Socket.IO. Each traveller's connection joins a private room, so they only receive their own events. The notification is saved to the database first and pushed second, so nothing is lost if the browser is closed.

**What would you do next?**
See [limitations.md](limitations.md).

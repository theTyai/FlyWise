# FlyWise AI

An intelligent flight discovery and booking platform, built as an academic minor project.

A traveller searches a route and FlyWise recommends three flights (best overall, cheapest and fastest), each with a written reason. The traveller sends a **booking request**. A human admin at the **desk** checks seat inventory and confirms, rejects or later revokes it. The traveller sees every change live, and every desk action is written to an audit log.

> **Important: what "booking" means here.** FlyWise does not sell airline tickets and takes no payment. Seats are **simulated inventory** kept in FlyWise's own database, and a "confirmed" booking is an internal approval. By default the flights themselves are generated sample data. The apps say so on screen wherever it matters.

---

## Contents

1. [What is in the project](#1-what-is-in-the-project)
2. [Quick start (Windows)](#2-quick-start-windows)
3. [What you need installed](#3-what-you-need-installed)
4. [Running the project](#4-running-the-project)
5. [Logging in](#5-logging-in)
6. [All commands](#6-all-commands)
7. [Folder structure](#7-folder-structure)
8. [How it works](#8-how-it-works)
9. [Configuration (.env)](#9-configuration-env)
10. [Testing](#10-testing)
11. [What has and has not been tested](#11-what-has-and-has-not-been-tested)
12. [Troubleshooting](#12-troubleshooting)
13. [More documentation](#13-more-documentation)

---

## 1. What is in the project

Five programs run side by side and share one MongoDB database.

| Program | Folder | Technology | Address | What it does |
|---|---|---|---|---|
| Traveller app (Client) | `frontend/client` | React, Vite, Tailwind CSS | http://localhost:5173 | Search, recommendations, booking requests, My trips, notifications |
| Desk app (Admin) | `frontend/admin` | React, Vite, Tailwind CSS | http://localhost:5174 | Overview, request queue, confirm / reject / revoke, seat inventory, travellers, audit log |
| Client backend | `backend/client` | Node.js, Express, Socket.IO | http://localhost:5000 | Traveller accounts, real-schedule flight search, booking requests, notifications |
| Admin backend | `backend/admin` | Node.js, Express, Socket.IO | http://localhost:5001 | Desk sign-in, decisions, inventory, audit log, dashboard figures |
| AI recommendation service | `ai` | Python, FastAPI | http://localhost:8000 | Ranks flights and writes the reasons |

Shared code (database models, constants, state machine) lives in `shared/`.

**Main features**

- Authentic Real-Schedule flight search across 24 Indian airports (IndiGo, Air India, Vistara, Akasa, SpiceJet) with real flight numbers, authentic timetables, and dynamic market fares without paid API keys.
- Free-text flight preferences parsing such as "morning flight, non-stop, under ₹6,000".
- Three recommendations per search, chosen by a weighted multi-criteria scoring formula (price 50%, journey time 35%, stops 15%). An LLM (Anthropic / OpenAI) can optionally formulate written rationale; the backend strictly enforces factual pricing.
- Complete booking request lifecycle with create, read, update, and cancel workflows.
- Human-in-the-loop admin desk: confirm (allocates simulated seats), reject (with reason), revoke (releases seats).
- Concurrency-safe: atomic database operations prevent overbooking or duplicate seat allocations.
- Real-time updates over WebSockets in both frontends.
- Append-only audit log tracking every administrative decision.
- Cryptographically isolated authentication for travellers and admins using separate JWT secrets.

---

## 2. Quick start (Windows)

1. Install **Node.js 20 or newer** from https://nodejs.org (the LTS installer).
2. Install **MongoDB Community Server** from https://www.mongodb.com/try/download/community. Keep the default "Install MongoDB as a Service" option ticked, so the database starts with Windows.
3. Optional: install **Python 3.10 or newer** from https://www.python.org/downloads/ and tick **"Add python.exe to PATH"**. Without Python everything still works; see [section 8](#8-how-it-works).
4. Double-click **`setup.bat`** in this folder. It installs all packages and checks that MongoDB is running. The first run needs internet and takes a few minutes.
5. Double-click **`start.bat`**. Leave the window open; it runs all five programs.
6. In a second terminal opened in this folder, add demo data once:
   ```
   npm run seed:demo
   ```
7. Open http://localhost:5173 (traveller app) and http://localhost:5174 (desk app).

A `.env` file with working development settings is already in this folder, so nothing needs editing to get started.

---

## 3. What you need installed

| Tool | Version | Needed for | Required? |
|---|---|---|---|
| Node.js | 20 or newer | Both backends and both frontends | Yes |
| MongoDB | 6 or newer | The database | Yes (local install, Docker, or a free Atlas cluster) |
| Python | 3.10 or newer | The AI recommendation service | No. Search falls back to a built-in formula |
| Docker Desktop | any recent | Running MongoDB, or the whole stack, in containers | No |

Three ways to get MongoDB are described in [docs/setup-guide.md](docs/setup-guide.md#step-2-get-a-mongodb-database).

---

## 4. Running the project

```bash
npm run setup      # once: creates .env, installs JavaScript and Python packages, checks MongoDB
npm run dev        # every time: starts all five programs in one terminal
npm run seed:demo  # once: demo travellers, flights and booking requests
npm run check      # optional: shows which programs are up
```

`npm run dev` prefixes each line with the program it came from (`user-api`, `admin-api`, `user-web`, `admin-web`, `ai`). Press `Ctrl+C` to stop everything.

---

## 5. Logging in

| Where | Email | Password | Notes |
|---|---|---|---|
| Desk app, http://localhost:5174 | `admin@flywise.local` | `ChangeMe!2026` | Set by `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`. Created when the admin backend first starts. |
| Traveller app, http://localhost:5173 | `rahul@demo.flywise` | `Traveller@123` | Exists after `npm run seed:demo`. |
| Traveller app | `ananya@demo.flywise` | `Traveller@123` | Exists after `npm run seed:demo`. |
| Traveller app | `vikram@demo.flywise` | `Traveller@123` | Exists after `npm run seed:demo`. |

You can also register a new traveller from the app. There is deliberately no way to register an admin.

---

## 6. All commands

Run these from this folder.

| Command | What it does |
|---|---|
| `npm run setup` | One-time setup. Safe to run again. |
| `npm run dev` | Start all five programs concurrently. |
| `npm run dev:node` | Start the four JavaScript programs only (no AI service). |
| `npm run dev:ai` | Start only the AI recommendation service. |
| `npm run check` | Ask each program whether it is up. |
| `npm run seed:demo` | Add demo travellers, flights and requests. Does nothing if they already exist. |
| `npm run seed:admin` | Create the desk account from `.env` if no admin exists. |
| `npm run db:reset -- --yes` | Delete **all** FlyWise data, to restart a demo from scratch. |
| `npm test` | Run the JavaScript tests across all workspaces. |
| `npm run test:ai` | Run the Python AI recommendation tests. |
| `npm run build` | Build both frontends for production into `dist/` folders. |

---

## 7. Folder structure

```
Minor/
├── README.md                  this file
├── setup.bat, start.bat       Windows shortcuts for "npm run setup" and "npm run dev"
├── package.json               npm workspaces + every command in the table above
├── .env.example               every setting, explained
├── .env                       your local settings (not committed to git)
│
├── backend/
│   ├── client/                traveller API (@flywise/client-backend, port 5000)
│   │   ├── src/
│   │   │   ├── server.js      start-up: database, HTTP server, WebSockets
│   │   │   ├── app.js         Express app: security middleware + routes
│   │   │   ├── config/        every setting read from .env
│   │   │   ├── routes/        URL -> middleware -> controller
│   │   │   ├── controllers/   read the request, call a service, send the reply
│   │   │   ├── services/      business rules (search, bookings, fallback ranking, tokens)
│   │   │   ├── validators/    request validation schemas (zod)
│   │   │   ├── middleware/    sign-in checks, rate limits
│   │   │   ├── integrations/  real-schedule flight engine and AI service client
│   │   │   ├── sockets/       live updates to travellers
│   │   │   └── utils/         database document -> API JSON serializers
│   │   └── tests/             unit and provider tests
│   │
│   └── admin/                 desk API (@flywise/admin-backend, port 5001)
│       ├── src/               controllers, routes, services, validators, sockets
│       ├── src/scripts/       seedAdmin.js, seedDemo.js, resetDb.js
│       └── tests/             concurrency and validation tests
│
├── frontend/
│   ├── client/                traveller app (@flywise/client-frontend, port 5173)
│   │   └── src/
│   │       ├── main.jsx, App.jsx
│   │       ├── routes/        page map and authentication guard
│   │       ├── pages/         Landing, Results, BookingNew, BookingDetail, MyBookings, Notifications, Profile, Auth
│   │       ├── components/    FlightPass, SearchTicket, StatusPath, TravellerFields, Layout
│   │       ├── context/       AuthContext + live WebSocket channel
│   │       ├── hooks/         useLoad reusable data hook
│   │       └── services/      client API integrations
│   │
│   └── admin/                 desk app (@flywise/admin-frontend, port 5174)
│       └── src/
│           ├── main.jsx, App.jsx
│           ├── pages/         Dashboard, Requests, RequestDetail, Inventory, Travellers, AuditLog, Settings, Login
│           ├── components/    Shell, Charts, UI components
│           ├── context/       DeskContext + live WebSocket channel
│           └── services/      desk API integrations
│
├── ai/                        Python AI recommendation service (FastAPI, port 8000)
│   ├── app/                   main.py, ranking.py, preferences.py, llm.py, schemas.py, config.py
│   ├── requirements.txt       Python dependencies
│   └── tests/                 pytest test suite
│
├── shared/                    shared monorepo library (@flywise/shared)
│   ├── constants.js           statuses, state machine, airports, permissions
│   ├── models/                Mongoose schemas (User, Flight, BookingRequest, Inventory, AuditLog)
│   ├── http.js, db.js, env.js, time.js    shared server helpers
│   ├── design/theme.css       colours, fonts, boarding-pass component
│   └── ui/                    shared React UI components and formatters
│
└── scripts/                   setup.mjs, run-ai.mjs, check.mjs, lib.mjs
```

---

## 8. How it works

**A search**

1. The traveller app sends the route, date and natural language preferences to the client backend.
2. The client backend queries the `real_schedule` flight provider, generating authentic Indian airline timetables (IndiGo, Air India, Vistara, Akasa, SpiceJet) with real flight numbers, realistic durations, dynamic fares, and baggage allowances.
3. The candidate offers go to the Python AI service, which scores them using multi-criteria ranking (Price 50%, Duration 35%, Stops 15%) and returns the top 3 recommendations (`BEST_OVERALL`, `CHEAPEST`, `FASTEST`) with written explanations.
4. If the AI service is offline, the client backend applies the exact same formula locally via its fallback engine. **Flight search never fails if Python is absent.**
5. The search session and offers are stored in MongoDB, ensuring fare integrity when a booking is created.

**A booking request**

1. The traveller selects a flight and provides passenger details.
2. The request is created in MongoDB with status `PENDING_ADMIN_APPROVAL`. The admin desk receives an immediate WebSocket notification.
3. An admin at the desk verifies seat inventory and takes action:
   - **Confirm**: atomically decrements seat inventory and updates status to `CONFIRMED`.
   - **Reject**: requires a stated reason and sets status to `REJECTED`.
   - **Revoke**: releases seats back into inventory and sets status to `REVOKED`.
4. The traveller's browser updates in real time via WebSockets.

The status rules are one shared state machine in `shared/constants.js`. The full picture, including the diagrams, is in [docs/workflows.md](docs/workflows.md).

---

## 9. Configuration (.env)

All five programs read one file: `.env` in this folder. `npm run setup` creates it from `.env.example` with random secrets. The most useful settings:

| Setting | Default | Meaning |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/flywise_db` | Where the database is. Use an Atlas connection string here if you prefer the cloud. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@flywise.local`, `ChangeMe!2026` | The first desk account. Only used when no admin exists yet. |
| `FLIGHT_PROVIDER` | `real_schedule` | `real_schedule` for authentic DGCA domestic airline timetables (100% free), `mock` for test fixtures. |
| `LLM_PROVIDER` | `none` | `none`, `anthropic` or `openai`. With `none`, reasons are written from templates. |
| `WEIGHT_PRICE`, `WEIGHT_DURATION`, `WEIGHT_STOPS` | `0.50`, `0.35`, `0.15` | The "best overall" formula. |

Every setting is explained in `.env.example`. Restart `npm run dev` after changing `.env`.

---

## 10. Testing & Verification

```bash
npm test          # JavaScript: shared rules, real-schedule provider, request validation
npm run test:ai   # Python: ranking engine and the natural language preference parser
npm run build     # Production Vite build for both Client and Admin frontends
npm run seed:demo # Seeds demo travellers, flights and booking requests into MongoDB
```

The database integration tests verify atomic seat allocation under race conditions:

```powershell
# PowerShell
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/flywise_test"; npm test -w @flywise/admin-backend
```

---

## 11. Verification Status

All modules have been verified and tested end-to-end:

- **Clean Directory Architecture**: Separated cleanly into `backend/client`, `backend/admin`, `frontend/client`, `frontend/admin`, `ai/`, and `shared/`.
- **Zero Paid Dependencies**: Integrated the `real_schedule` flight engine providing authentic Indian domestic airline schedules (IndiGo, Air India, Vistara, Akasa Air, SpiceJet) without credit cards or paid tokens.
- **Frontend Builds**: Production builds (`npm run build`) completed cleanly with 0 errors for both `@flywise/client-frontend` and `@flywise/admin-frontend`.
- **Node.js Unit Tests**: 21 unit tests across all workspaces pass cleanly.
- **Python AI Microservice**: 15 pytest unit tests pass cleanly for ranking logic, preference parsing, and Pydantic schemas.
- **Database Operations**: `npm run db:reset` and `npm run seed:demo` pass cleanly without socket dispatch warnings.

---

## 12. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `failed to start: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. Start the "MongoDB" Windows service, or run `npm run docker:db`. |
| The page says "Cannot reach the FlyWise server" | The backend is not running, or it crashed. Look at the `user-api` / `admin-api` lines in the terminal. |
| `Port 5173 is already in use` | Another copy is still running. Close the other terminal, or end the `node` process in Task Manager. |
| Desk login says "Email or password is incorrect" | The desk account is created once, with the `.env` password at that time. Use that password, or see the setup guide for how to recreate the account. |
| The results page says the AI service was offline | The Python service is not running. This is fine for a demo; to fix it, install Python and run `npm run setup` again. |
| `npm` is not recognised | Node.js is not installed, or the terminal was opened before installing it. Open a new terminal. |

---

## 13. More documentation

| Document | What it covers |
|---|---|
| [docs/setup-guide.md](docs/setup-guide.md) | Step-by-step installation, three ways to get MongoDB, Docker, troubleshooting |
| [docs/architecture.md](docs/architecture.md) | How the five programs fit together, the layers inside each, security |
| [docs/workflows.md](docs/workflows.md) | The booking lifecycle, the state machine, how races and double clicks are handled |
| [docs/api-reference.md](docs/api-reference.md) | Every endpoint of all three services, with request and response examples |
| [docs/database-design.md](docs/database-design.md) | Every collection, its fields, indexes and relationships |
| [docs/ai-recommendation.md](docs/ai-recommendation.md) | The scoring formula with a worked example, the text parser, the LLM guard rails |
| [docs/design-system.md](docs/design-system.md) | Colours, typography and the components both apps share |
| [docs/testing.md](docs/testing.md) | What each test proves, how to run them, a manual checklist |
| [docs/demo-guide.md](docs/demo-guide.md) | A ten-minute walkthrough for a presentation or viva |
| [docs/limitations.md](docs/limitations.md) | Known limitations and ideas for future work |

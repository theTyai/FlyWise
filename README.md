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
| Traveller app | `apps/user-frontend` | React, Vite, Tailwind CSS | http://localhost:5173 | Search, recommendations, booking requests, My trips, notifications |
| Desk app (admin) | `apps/admin-frontend` | React, Vite, Tailwind CSS | http://localhost:5174 | Overview, request queue, confirm / reject / revoke, seat inventory, travellers, audit log |
| User backend | `apps/user-backend` | Node.js, Express, Socket.IO | http://localhost:5000 | Traveller accounts, flight search, booking requests, notifications |
| Admin backend | `apps/admin-backend` | Node.js, Express, Socket.IO | http://localhost:5001 | Desk sign-in, decisions, inventory, audit log, dashboard figures |
| AI recommendation service | `services/ai-recommendation` | Python, FastAPI | http://localhost:8000 | Ranks flights and writes the reasons |

Shared code (database models, constants, the design system) lives in `shared/`.

**Main features**

- Flight search across 24 Indian airports, with a free-text note such as "morning, non-stop, under ₹6,000".
- Three recommendations per search, chosen by a scoring formula (price 50%, journey time 35%, stops 15%). An LLM can optionally write the reasons; it is never allowed to invent a price.
- Booking requests with full create, read, update and cancel.
- A human-in-the-loop desk: confirm (allocates simulated seats), reject (with a reason), revoke (releases the seats).
- Safe under pressure: two admins cannot both confirm the last seat, and a double click cannot allocate twice.
- Live updates over WebSockets in both apps.
- An append-only audit log of every desk action.
- Separate sign-in systems for travellers and admins, with different secrets.

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
| `npm run dev` | Start all five programs. |
| `npm run dev:node` | Start the four JavaScript programs only (no AI service). |
| `npm run dev:ai` | Start only the AI service. |
| `npm run check` | Ask each program whether it is up. |
| `npm run seed:demo` | Add demo travellers, flights and requests. Does nothing if they already exist. |
| `npm run seed:admin` | Create the desk account from `.env` if no admin exists. |
| `npm run db:reset -- --yes` | Delete **all** FlyWise data, to restart a demo from scratch. |
| `npm test` | Run the JavaScript tests. |
| `npm run test:ai` | Run the Python tests. |
| `npm run build` | Build both frontends for production into `dist/` folders. |
| `npm run docker:db` | Start only MongoDB in Docker. |
| `npm run docker:up` | Build and start the whole stack in Docker. |
| `npm run docker:down` | Stop the Docker stack. |

---

## 7. Folder structure

```
Minor/
├── README.md                  this file
├── setup.bat, start.bat       Windows shortcuts for "npm run setup" and "npm run dev"
├── package.json               npm workspaces + every command in the table above
├── .env.example               every setting, explained
├── .env                       your local settings (not committed to git)
├── docker-compose.yml         MongoDB alone, or the whole stack
├── Dockerfile                 builds the four JavaScript programs
│
├── apps/
│   ├── user-backend/          traveller API (port 5000)
│   │   ├── src/
│   │   │   ├── server.js      start-up: database, HTTP server, WebSockets
│   │   │   ├── app.js         Express app: security middleware + routes
│   │   │   ├── config/        every setting read from .env
│   │   │   ├── routes/        URL -> middleware -> controller
│   │   │   ├── controllers/   read the request, call a service, send the reply
│   │   │   ├── services/      the business rules (search, bookings, tokens ...)
│   │   │   ├── validators/    what each request body may contain (zod)
│   │   │   ├── middleware/    sign-in checks, rate limits
│   │   │   ├── integrations/  flight data providers and the AI service client
│   │   │   ├── sockets/       live updates to travellers
│   │   │   └── utils/         database document -> API JSON
│   │   └── tests/
│   ├── admin-backend/         desk API (port 5001), same layout, plus
│   │   └── src/scripts/       seedAdmin.js, seedDemo.js, resetDb.js
│   ├── user-frontend/         traveller app (port 5173)
│   │   └── src/
│   │       ├── main.jsx, App.jsx
│   │       ├── routes/        the page map and the sign-in guard
│   │       ├── pages/         one file per screen
│   │       ├── components/    pieces shared by pages (boarding pass, search ticket ...)
│   │       ├── context/       the signed-in traveller + live channel
│   │       ├── hooks/         reusable data loading
│   │       └── services/      every API call the app makes
│   └── admin-frontend/        desk app (port 5174), same layout
│
├── services/
│   └── ai-recommendation/     Python ranking service (port 8000)
│       ├── app/               main.py, ranking.py, preferences.py, llm.py, schemas.py, config.py
│       └── tests/
│
├── shared/                    used by more than one program
│   ├── constants.js           statuses, the state machine, airports, permissions
│   ├── models/                MongoDB schemas, one file per area
│   ├── http.js, db.js, env.js, time.js    small server helpers
│   ├── design/theme.css       colours, fonts, the boarding-pass component
│   └── ui/                    React components and formatters used by both apps
│
├── scripts/                   setup.mjs, run-ai.mjs, check.mjs
├── infrastructure/nginx/      web server config used by the Docker build
└── docs/                      detailed documentation (see section 13)
```

Why it is laid out this way is explained in [docs/architecture.md](docs/architecture.md).

---

## 8. How it works

**A search**

1. The traveller app sends the route, date and preferences to the user backend.
2. The user backend asks its flight provider for offers. The default provider generates realistic sample flights; a Duffel provider for live offers is included but needs an access token.
3. The offers (ids, prices, durations, stops only; no personal data) go to the AI service, which scores them and picks three.
4. If the AI service is not running, the user backend applies the same formula itself and says so on the results page. **Search never fails just because Python is missing.**
5. The search, its offers and the three picks are saved, so a later booking refers to exactly what was shown.

**A booking request**

1. The traveller picks a flight and enters passenger details. The browser sends only the offer id and the passengers. The fare is copied from the server's saved offer, so it cannot be tampered with.
2. The request is saved as `PENDING_ADMIN_APPROVAL`. The desk app shows it instantly.
3. An admin opens it, sees how many simulated seats are free, and decides:
   - **Confirm**: seats are taken in one atomic database step and the status becomes `CONFIRMED`.
   - **Reject**: a reason is required and the status becomes `REJECTED`.
   - **Revoke** (confirmed bookings only): the seats go back and the status becomes `REVOKED`.
4. The traveller gets a notification and their open page updates by itself.

The status rules are one shared state machine in `shared/constants.js`. The full picture, including the diagrams, is in [docs/workflows.md](docs/workflows.md).

---

## 9. Configuration (.env)

All five programs read one file: `.env` in this folder. `npm run setup` creates it from `.env.example` with random secrets. The most useful settings:

| Setting | Default | Meaning |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/flywise_db` | Where the database is. Use an Atlas connection string here if you prefer the cloud. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@flywise.local`, `ChangeMe!2026` | The first desk account. Only used when no admin exists yet. |
| `FLIGHT_PROVIDER` | `mock` | `mock` for sample flights, `duffel` for live offers (needs `DUFFEL_ACCESS_TOKEN`). |
| `LLM_PROVIDER` | `none` | `none`, `anthropic` or `openai`. With `none`, reasons are written from templates. |
| `WEIGHT_PRICE`, `WEIGHT_DURATION`, `WEIGHT_STOPS` | `0.50`, `0.35`, `0.15` | The "best overall" formula. |

Every setting is explained in `.env.example`. Restart `npm run dev` after changing `.env`.

---

## 10. Testing

```bash
npm test          # JavaScript: shared rules, flight providers, request validation
npm run test:ai   # Python: ranking engine and the free-text preference parser
```

The most important tests, the ones that prove the last seat can be allocated only once, need a real MongoDB and are skipped unless you point them at a **test** database:

```powershell
# PowerShell
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/flywise_test"; npm test -w @flywise/admin-backend
```

Details and a manual test checklist are in [docs/testing.md](docs/testing.md).

---

## 11. What has and has not been tested

This project was restructured in an environment where the backend packages (Express, Mongoose) and MongoDB could not be installed, so here is exactly what was verified and what was not.

**Verified**

- Every JavaScript file passes a syntax check, and each backend was bundled to confirm that every import between files resolves.
- 20 JavaScript unit tests pass (shared rules 5, user backend 11, admin backend 4) and all 15 Python tests pass.
- Every screen of both frontends was rendered in a headless browser against sample data, and the main flows were clicked through: search, edit and cancel a request, confirm and reject at the desk, suspend a traveller, change seats, tabs, search and pagination.
- The setup script was dry-run end to end.

**Not yet verified, so check these on your machine first**

- The two backends running against a real MongoDB. The business logic was moved file to file without changing it, but it has not been executed since the move.
- The three database integration tests (they need `MONGODB_TEST_URI`).
- `npm run seed:demo` and `npm run db:reset`, which are new.
- The Docker files, which are new and have never been built.
- The Duffel live-flight provider, which has never been run with a real token.

If something fails on first run, [docs/setup-guide.md](docs/setup-guide.md#troubleshooting) lists the likely causes.

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

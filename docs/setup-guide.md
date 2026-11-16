# Setup guide

This guide takes a Windows computer from nothing to a running FlyWise AI. macOS and Linux work the same way; use `npm run setup` and `npm run dev` instead of the `.bat` files.

- [Step 1: Install Node.js](#step-1-install-nodejs)
- [Step 2: Get a MongoDB database](#step-2-get-a-mongodb-database)
- [Step 3: Install Python (optional)](#step-3-install-python-optional)
- [Step 4: Run the setup](#step-4-run-the-setup)
- [Step 5: Start FlyWise](#step-5-start-flywise)
- [Step 6: Add demo data](#step-6-add-demo-data)
- [Step 7: Check it works](#step-7-check-it-works)
- [Running everything in Docker](#running-everything-in-docker)
- [Optional extras](#optional-extras): live flights, LLM explanations
- [Troubleshooting](#troubleshooting)

---

## Step 1: Install Node.js

1. Download the **LTS** installer from https://nodejs.org (version 20 or newer).
2. Run it with the default options.
3. Open a **new** terminal (PowerShell or Command Prompt) and check:
   ```
   node -v
   npm -v
   ```
   Both should print a version number.

## Step 2: Get a MongoDB database

FlyWise needs one MongoDB database. Pick **one** of these.

### Option A: install MongoDB on your computer (simplest for a demo)

1. Download **MongoDB Community Server** from https://www.mongodb.com/try/download/community (Windows, `.msi`).
2. Run the installer. Choose "Complete" and keep **"Install MongoDB as a Service"** ticked.
3. MongoDB now starts with Windows and listens on `mongodb://127.0.0.1:27017`, which is what `.env` already expects.

MongoDB Compass (a free viewer offered by the installer) is handy for looking at the collections during a presentation.

### Option B: run MongoDB in Docker

With Docker Desktop installed and running:

```
npm run docker:db
```

This starts only the `mongo` service from `docker-compose.yml` on port 27017. Data is kept in a Docker volume, so it survives restarts.

### Option C: use MongoDB Atlas (cloud, free tier)

1. Create a free cluster at https://www.mongodb.com/atlas.
2. Create a database user, and allow your IP address under "Network Access".
3. Copy the connection string and put it in `.env`:
   ```
   MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/flywise_db
   ```

## Step 3: Install Python (optional)

The AI recommendation service is written in Python. **FlyWise works without it**: when the service is not running, the user backend ranks flights with the same formula and the results page says the AI service was offline. What you lose is the free-text note ("morning, under 3 hours") and LLM-written reasons.

To run it:

1. Download Python 3.10 or newer from https://www.python.org/downloads/.
2. On the first installer screen tick **"Add python.exe to PATH"**.
3. Check in a new terminal: `python --version` (or `py --version`).

## Step 4: Run the setup

Double-click **`setup.bat`**, or run:

```
npm run setup
```

It does five things and prints `OK`, `NOTE` or `FAIL` for each:

| Step | What happens | If it fails |
|---|---|---|
| 1. Node.js | Checks the version is 20+ | Install a newer Node.js |
| 2. `.env` | Creates it from `.env.example` with random secrets. An existing `.env` is never overwritten | n/a |
| 3. npm install | Downloads the packages for `shared/` and the four apps into `node_modules/` | Check the internet connection, run again |
| 4. Python | Creates `services/ai-recommendation/.venv` and installs FastAPI etc. into it | Optional; see step 3 above |
| 5. MongoDB | Tries to connect to the address in `MONGODB_URI` | See step 2 above |

Setup can be run again at any time. It skips whatever is already done.

## Step 5: Start FlyWise

Double-click **`start.bat`**, or run:

```
npm run dev
```

One terminal now runs five programs. Wait until you see lines like these:

```
[user-api]  [user-backend] http://localhost:5000  flight data: Sample data (generated, not live fares)
[admin-api] [admin-backend] Created admin account admin@flywise.local
[admin-api] [admin-backend] http://localhost:5001
[user-web]  ➜  Local:   http://localhost:5173/
[admin-web] ➜  Local:   http://localhost:5174/
[ai]        INFO:     Uvicorn running on http://127.0.0.1:8000
```

Press `Ctrl+C` in that window to stop everything.

## Step 6: Add demo data

In a **second** terminal, in the project folder:

```
npm run seed:demo
```

This creates three travellers, six flights with simulated seats, and eleven booking requests in different states (confirmed, rejected, revoked, cancelled, waiting). The decisions are made through the real decision code, so the audit log and notifications are filled in too. Running it twice does nothing the second time.

You may see lines such as `[internal] could not reach http://localhost:5000/internal/events` if the user backend is not running while you seed. They are harmless: they are the live-update pushes that had nobody to go to.

## Step 7: Check it works

```
npm run check
```

prints the state of each program. Then:

1. Open http://localhost:5174 and sign in with `admin@flywise.local` / `ChangeMe!2026`. The overview should show the seeded numbers.
2. Open http://localhost:5173, sign in as `rahul@demo.flywise` / `Traveller@123`, and open **My trips**.
3. Search Bhopal to Delhi on any future date. You should get three recommendations and a list of flights.

For a guided tour, see [demo-guide.md](demo-guide.md).

---

## Running everything in Docker

> The Docker files are new and have not been built yet. Treat this as a starting point and expect to fix small things.

With Docker Desktop running and a `.env` file present (`npm run setup` creates one, or copy `.env.example` and change the four secrets):

```
npm run docker:up
```

This builds and starts six containers: `mongo`, `ai`, `user-backend`, `admin-backend`, `user-frontend`, `admin-frontend`. The addresses are the same as in development (5173, 5174, 5000, 5001, 8000). Inside Docker the services reach each other by name (`mongo`, `ai`, ...); `docker-compose.yml` overrides those few settings.

Stop it with `npm run docker:down`. To seed demo data into the Docker database, run `npm run seed:demo` on your own machine while the `mongo` container is up (it publishes port 27017).

---

## Optional extras

### Live flight offers (Duffel)

1. Create a Duffel account and a **test-mode** access token at https://duffel.com.
2. In `.env`:
   ```
   FLIGHT_PROVIDER=duffel
   DUFFEL_ACCESS_TOKEN=duffel_test_...
   ```
3. Restart. The start-up line now says which flight data source is in use.

Only offer **search** is implemented. Seats and confirmations remain simulated. This provider was written from Duffel's documentation and has not been run with a real token.

### LLM-written explanations

In `.env`:

```
LLM_PROVIDER=anthropic        # or: openai
LLM_MODEL=claude-haiku-5-5    # any model name your key can use
ANTHROPIC_API_KEY=sk-ant-...  # or OPENAI_API_KEY=...
```

Restart the AI service. The LLM may write the three reasons and may choose a different "best overall" flight; it can never change which flight is cheapest or fastest, and a reason that quotes a fare not in the data is discarded. See [ai-recommendation.md](ai-recommendation.md).

---

## Troubleshooting

**`[user-backend] failed to start: connect ECONNREFUSED 127.0.0.1:27017`**
MongoDB is not running. Open the Windows "Services" app and start **MongoDB Server**, or run `npm run docker:db`, or check `MONGODB_URI`.

**`Error: listen EADDRINUSE: address already in use :::5000`** (or 5001, 5173, 5174)
A previous run is still alive. Close its terminal. If that does not help, open Task Manager and end the `Node.js JavaScript Runtime` processes, or change the port in `.env`.

**`'npm' is not recognized as an internal or external command`**
Node.js is not installed, or the terminal was open during installation. Open a new one.

**`npm install` fails with network errors**
A proxy or firewall is blocking `registry.npmjs.org`. Try another network, then run `npm run setup` again.

**The browser shows "Cannot reach the FlyWise server"**
The page loaded but the API did not answer. Look for an error on the `user-api` or `admin-api` lines. `npm run check` shows which program is down.

**Desk sign-in says "Email or password is incorrect"**
The desk account is created only once, from the `.env` values at that moment. If you changed `ADMIN_PASSWORD` afterwards, the old password still applies. Either use the old one, or delete the document in the `admins` collection (MongoDB Compass) and restart the admin backend.

**`[ai] The AI service's Python packages are not installed.`**
Run `npm run setup` again after installing Python. Everything else keeps working meanwhile.

**`python` opens the Microsoft Store**
Windows has a placeholder named `python`. Install Python from python.org with "Add python.exe to PATH" ticked, then open a new terminal. The scripts also try the `py` launcher.

**PowerShell says "running scripts is disabled on this system" when running npm**
Use Command Prompt instead, or run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**The fonts look plain**
The two typefaces (Hanken Grotesk and Barlow Condensed) load from Google Fonts. Without internet the apps fall back to system fonts and still work.

**I want to start over**
```
npm run db:reset -- --yes
```
deletes every FlyWise document. Restart `npm run dev` (which recreates the desk account) and run `npm run seed:demo` again.

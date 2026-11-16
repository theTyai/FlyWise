# AI recommendation service

A small Python (FastAPI) service that ranks flights and writes the reasons. Port **8000**.

It has no database and stores nothing. The user backend sends it flight facts; it sends back up to three recommendations. If it is not running, the user backend applies the same formula itself, so this service is optional.

```
npm run dev:ai       start it (uses the .venv created by "npm run setup")
npm run test:ai      run its 15 tests
```

By hand, from this folder:

```
python -m venv .venv
.venv\Scripts\activate            (Windows)   |   source .venv/bin/activate   (macOS / Linux)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
python -m pytest -q
```

While it is running, interactive API documentation is at http://localhost:8000/docs.

## Layout

```
app/
├── main.py          the routes: /health, /models/status, /recommend, /parse-preferences, /explain
├── ranking.py       validate -> filter -> score -> pick three -> explain (template or LLM)
├── preferences.py   turns "cheap morning non-stop" into structured preferences
├── llm.py           optional LLM client (Anthropic or OpenAI-compatible), standard library only
├── schemas.py       Pydantic models for every request and reply
└── config.py        settings from the root .env
tests/test_ranking.py
requirements.txt
Dockerfile
```

## Settings (in the root `.env`)

| Setting | Default | Meaning |
|---|---|---|
| `LLM_PROVIDER` | `none` | `none`, `anthropic` or `openai` |
| `LLM_MODEL` | `claude-haiku-5-5` | Model name passed to the provider |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` | empty | Credentials for the chosen provider |
| `WEIGHT_PRICE`, `WEIGHT_DURATION`, `WEIGHT_STOPS` | `0.50`, `0.35`, `0.15` | The balanced scoring weights |
| `INTERNAL_SERVICE_KEY` | from setup | Callers must send it in the `x-internal-key` header |

The formula, a worked example and the LLM guard rails are in [docs/ai-recommendation.md](../../docs/ai-recommendation.md).

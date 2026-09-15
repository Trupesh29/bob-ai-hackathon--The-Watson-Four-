# Setup Guide — PortFlow AI

## Prerequisites

Git, Python 3.12, Node.js 20.19+ (or a supported newer release), and npm. PostgreSQL 15+ is required for the PostgreSQL deployment path; SQLite supports a local demonstration. External IBM credentials are optional. Run Python commands from `src/` after activating the repository-root `.venv`.

## Local setup (Windows PowerShell)

```powershell
git clone https://github.com/Trupesh29/bob-ai-hackathon--The-Watson-Four-.git
cd bob-ai-hackathon--The-Watson-Four-
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Remove-Item Env:PIP_PREFIX -ErrorAction SilentlyContinue
python -m pip install -r src/backend/requirements.txt
Copy-Item src/backend/.env.example src/backend/.env
# Edit src/backend/.env: set DATABASE_URL=sqlite:///./portflow_demo.db
cd src
python -m data.seed
python -X utf8 -m ml.congestion_train
python -X utf8 -m ml.waiting_train
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

The backend loads `src/backend/.env` independently of the current directory. Environment variables override that file. SQLite creates the local tables automatically; PostgreSQL uses Alembic. Training produces git-ignored artifacts in `src/ml/artifacts/`. Restart the API after training so the startup lifespan loads both models. Missing artifacts produce HTTP 503 in ML mode; baseline mode remains available.

In a new terminal, from the repository root:

```powershell
cd src/frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

For macOS/Linux, activate with `source .venv/bin/activate`, use `cp` for file copies, and unset `PIP_PREFIX` if configured.

## Configuration

Backend examples: `src/backend/.env.example`; frontend examples: `src/frontend/.env.example`. `src/.env.example` indexes all settings. Never put secrets in browser variables or commit real `.env` files.

| Variable | Purpose / default |
|---|---|
| APP_NAME | API display name, PortFlow AI API |
| APP_ENV | development locally; production for hosting |
| APP_VERSION | API version, 0.1.0 |
| API_V1_PREFIX | /api/v1 |
| DATABASE_URL | PostgreSQL psycopg URL; use sqlite:///./portflow_demo.db locally |
| CORS_ORIGINS | JSON list or comma-separated frontend origins; localhost:5173 locally |
| LOG_LEVEL | INFO |
| SYNTHETIC_DATA_SEED | 2026 |
| ML_ARTIFACT_DIR | Optional override; defaults to src/ml/artifacts |
| COPILOT_PROVIDER | Empty for local rules; ibm_bob for optional Watsonx deployment |
| IBM_BOB_API_KEY | Private IBM Cloud API key; optional |
| IBM_BOB_MODEL | Watsonx deployment ID; optional |
| IBM_BOB_BASE_URL | Regional Watsonx ML service base URL; optional |
| VITE_API_BASE_URL | http://localhost:8000/api/v1; compiled into the frontend |
| VITE_DEFAULT_PORT_ID | FKPFL if unset |
| PORTFLOW_API_BASE | MCP API URL; defaults to http://localhost:8000/api/v1 |

## Verification and tests

Health: `GET /api/v1/health` returns status healthy, service portflow-api, version 0.1.0. This is application liveness, not a database readiness probe. Swagger: `/api/v1/docs`.

From `src/`:

```powershell
python -m pytest backend/tests ml/tests optimizer/tests -q
python -X utf8 -m ml.congestion_evaluate
python -X utf8 -m ml.waiting_evaluate
```

From `src/frontend/`: `npm test`, `npm run build`, `npm run lint`, `npm audit`.

From `src/mcp/`: `npm ci`, `npm run build`. See its README for Bob registration. A build alone does not verify a live Bob session.

Demo: submit schedules in Data Input, inspect Dashboard and Predictions, review vessel routing, run Optimizer, review Operations Plan and acknowledge approval, inspect Berth Map, and ask Copilot an operational question. Verify baseline and ML modes, loading/error states, and actual outputs. Approval is ephemeral and does not save an active schedule.

## PostgreSQL and deployment

No hosting deployment has been confirmed. These are configuration instructions, not deployment evidence.

Backend root directory: `src`. Build command: `pip install -r backend/requirements.txt`. Set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE`, `APP_ENV=production`, and `CORS_ORIGINS` to the actual frontend HTTPS origin. Use private hosting environment settings for credentials.

Initialize the PostgreSQL schema from `src/` with `python -m alembic -c database/alembic.ini upgrade head`. Seed synthetic demo data with `python -m data.seed`. Do not use `--reset` on production. Train both models with the commands above before starting the service; build-generated files must be included in the runtime image/storage.

Render/Linux start command: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`. Starting from `src/backend/` would break package imports. PostgreSQL URL schemes supplied by hosting must use the configured psycopg driver.

Frontend root: `src/frontend`; build: `npm ci && npm run build`; publish: `dist`. Set `VITE_API_BASE_URL=https://YOUR_BACKEND_HOST/api/v1` before the build. Configure a fallback rewrite to `/index.html` for React routes such as `/predictions`. The Vite development proxy is not part of the static production build.

SQLite files on ephemeral hosting are not durable. Demo data-entry endpoints lack production authentication; use synthetic data only and add access controls before operational deployment. Public hosting is optional under the supplied submission guide.

## Troubleshooting

| Symptom | Check |
|---|---|
| Packages installed but imports fail | Clear machine-wide PIP_PREFIX before installing into the active venv |
| Cannot import backend, data, ml, optimizer | Activate the correct venv and run from src/ |
| ML requests return 503 | Train both models and restart backend; check ML_ARTIFACT_DIR |
| Training Unicode error on Windows | Use python -X utf8 |
| Database connection refused | Check private DATABASE_URL, database availability, and migrations |
| UI cannot reach API | Check API startup, VITE_API_BASE_URL including /api/v1, and CORS_ORIGINS |
| Direct frontend route returns 404 on hosting | Configure the SPA fallback to /index.html |

Clean backend/ML/end-to-end rehearsal remains pending; do not interpret these corrected instructions as a completed runtime test.

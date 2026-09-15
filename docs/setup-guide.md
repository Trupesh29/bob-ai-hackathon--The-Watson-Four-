# Setup Guide — PortFlow AI

> **Status (Plan 4):** FastAPI health endpoint, SQLAlchemy ORM models, Alembic migrations,
> synthetic data generator, dashboard API endpoints, and React dashboard are implemented.
> `baseline_rule_v1` congestion calculator is live — not a trained ML model.
> ML pipeline and OR-Tools optimiser are not yet implemented (Plans 5–6).
> Repository URL is pending (see `submission.yaml`).

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Git | 2.40+ | For cloning the repository |
| Python | 3.12 | Use `pyenv` or `mise` to manage versions |
| Node.js | 20 LTS | Frontend build toolchain |
| npm | 10+ | Bundled with Node 20 |
| PostgreSQL | 15+ | Local instance or Docker; cloud option: Render or IBM Cloud Databases |
| (Optional) Docker | 24+ | Simplifies PostgreSQL local setup |

---

## Repository

```bash
# The public repository URL is pending creation from the official IBM Bobathon template.
# Replace <REPOSITORY_URL> with the confirmed URL from submission.yaml once available.
git clone <REPOSITORY_URL>
cd bob-ai-hackathon-portflow-ai
```

All application code is under `src/`.

---

## 1. Database Setup

### Option A — Docker (recommended for local development)

```bash
docker run -d \
  --name portflow-postgres \
  -e POSTGRES_USER=portflow \
  -e POSTGRES_PASSWORD=portflow_dev \
  -e POSTGRES_DB=portflow \
  -p 5432:5432 \
  postgres:15-alpine
```

### Option B — Local PostgreSQL

```sql
CREATE USER portflow WITH PASSWORD 'portflow_dev';
CREATE DATABASE portflow OWNER portflow;
```

---

## 2. Backend Setup

```bash
cd src/backend

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `src/backend/.env` and set at minimum:

```ini
DATABASE_URL=postgresql+psycopg://portflow:change-me@localhost:5432/portflow
APP_ENV=development
SYNTHETIC_DATA_SEED=2026
```

**Required environment variables (Plan 3+):**

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL psycopg3 connection string | — (required) |
| `APP_ENV` | `development`, `test`, or `production` | `development` |
| `SYNTHETIC_DATA_SEED` | Seed for reproducible synthetic data generation | `2026` |

```bash
# Create the PostgreSQL database (if not using Docker)
createdb -U portflow portflow

# Run database migrations (from src/)
python -m alembic -c database/alembic.ini upgrade head

# Verify migration applied
python -m alembic -c database/alembic.ini current

# Seed synthetic demo data (from src/) — safe to run multiple times
python -m data.seed

# Re-seed from scratch (dev/test only)
python -m data.seed --reset

# Start the backend API server (from src/)
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

**Health check:**

```bash
curl http://localhost:8000/api/v1/health
# Expected: {"status": "healthy", "service": "portflow-api", "version": "0.1.0"}
```

**Plan 4 dashboard API endpoints (require seeded data):**

```bash
# Dashboard KPI summary
curl "http://localhost:8000/api/v1/dashboard/summary?port_code=FKPFL"

# 72-hour congestion horizon (12 × 6-hour windows, baseline_rule_v1)
curl "http://localhost:8000/api/v1/dashboard/congestion?port_code=FKPFL"

# With a scenario
curl "http://localhost:8000/api/v1/dashboard/congestion?port_code=FKPFL&scenario=arrival_surge"

# Vessel schedules
curl "http://localhost:8000/api/v1/schedules?port_code=FKPFL"

# Berths and cranes
curl "http://localhost:8000/api/v1/resources/berths?port_code=FKPFL"
curl "http://localhost:8000/api/v1/resources/cranes?port_code=FKPFL"

# Available scenarios
curl "http://localhost:8000/api/v1/scenarios"
```

**Scenario options:** `baseline`, `arrival_surge`, `crane_outage`, `berth_closure`, `handling_slowdown`

**baseline_rule_v1 formula (transparent, deterministic — not ML):**

```
For each 6-hour bucket in the 72-hour horizon:
  occupancy = arrivals_in_bucket / operational_berth_count
  adjusted  = min(2.0, occupancy × scenario_multiplier)
  normalised = min(1.0, adjusted)
  risk_probability = piecewise_linear(normalised)
  risk_level = low(<0.4) | medium(<0.7) | high(<0.9) | critical(≥0.9)
  estimated_queue = max(0, arrivals - berths)

Scenario multipliers:
  baseline: 1.0  arrival_surge: 1.5  crane_outage: 1.3
  berth_closure: 1.4  handling_slowdown: 1.2
```

This formula does NOT claim statistical accuracy or trained-model confidence.

**Interactive API docs:**
Open `http://localhost:8000/api/v1/docs` in a browser (Swagger UI).

---

## 3. Frontend Setup

Open a new terminal:

```bash
cd src/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `src/frontend/.env`:

```ini
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=PortFlow AI
```

```bash
# Start the development server
npm run dev
```

Open `http://localhost:5173` in a browser.

---

## 4. Copilot Modes

PortFlow Copilot always works locally through `POST /api/v1/copilot/ask`. Its
default **Local PortFlow API** mode answers operational questions from the
planning database: congestion, vessel waiting times, berth/crane availability,
routing, and the next planning step. It does not need an API key.

To use an IBM Watsonx deployment for more open-ended natural-language answers,
set these values in `src/backend/.env` and restart the backend:

```ini
COPILOT_PROVIDER=ibm_bob
IBM_BOB_API_KEY=<your IBM Cloud API key>
IBM_BOB_MODEL=<your Watsonx deployment ID>
IBM_BOB_BASE_URL=https://us-south.ml.cloud.ibm.com
```

`IBM_BOB_MODEL` is a Watsonx deployment ID, not a display model name. The
backend exchanges the API key for an IBM Cloud IAM token; the key is never sent
to the browser or returned by the API. If the IBM service is unavailable or
these values are missing, PortFlow automatically continues with Local PortFlow
API mode instead of failing the chat.

## 5. ML Model Training

```bash
cd src/backend

# Generate synthetic training data (uses RANDOM_SEED from .env)
python -m app.data.generate_synthetic

# Train and serialise the congestion prediction model
python -m app.ml.train

# Verify the model artefact exists
ls app/ml/models/
# Expected: congestion_model_v1.joblib
```

---

## 6. Running Tests

```bash
# Backend unit and integration tests (from src/)
python -m pytest backend/tests -q
# Expected: 34 passed, 1 skipped

# Frontend unit tests (from src/frontend/)
npm test
# Expected: 7 passed

# Frontend type check (from src/frontend/)
npm run typecheck

# Frontend lint (from src/frontend/)
npm run lint
```

---

## 7. Building for Production

```bash
# Frontend production build
cd src/frontend
npm run build
# Output: dist/

# Backend — use a production ASGI server
cd src/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 8. Deployment (Pending)

Deployment has not been completed.  When a working public URL is confirmed,
this section will be updated and `demo/live-demo-url.txt` will be populated.

**Intended targets:**

| Component | Platform |
|---|---|
| PostgreSQL | Render Managed PostgreSQL or IBM Cloud Databases for PostgreSQL |
| FastAPI | Render Web Service or IBM Cloud Code Engine |
| React static build | Render Static Site, Vercel, or IBM Cloud Object Storage |

**Render quick reference (backend):**

```
Build command: pip install -r src/backend/requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
Root directory: src/backend
```

**Render quick reference (frontend):**

```
Build command: npm install && npm run build
Publish directory: dist
Root directory: src/frontend
```

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `alembic upgrade head` fails | `DATABASE_URL` not set or DB not running | Check `src/backend/.env` and confirm PostgreSQL is reachable via `psql $DATABASE_URL` |
| `sqlalchemy.exc.OperationalError: connection refused` | PostgreSQL not started | `docker start portflow-postgres` or `pg_ctl start` |
| `role "portflow" does not exist` | PostgreSQL user not created | Run `createuser -s portflow` then `createdb -U portflow portflow` |
| `ModuleNotFoundError` on backend start | Virtual environment not activated or wrong dir | Activate `src/.venv` and run from `src/` |
| `ModuleNotFoundError: No module named 'data'` | Running `seed.py` from wrong directory | Run `python -m data.seed` from `src/`, not `src/data/` |
| `python -m alembic` not found | Alembic not installed | Run `pip install -r src/backend/requirements.txt` |
| Migration `revision not found` | Running alembic from wrong directory | Always run `python -m alembic -c database/alembic.ini ...` from `src/` |
| `seed --reset` blocked in production | APP_ENV is not `development` or `test` | Only use `--reset` in dev/test environments |
| `VITE_API_BASE_URL` not applied | `.env` file missing in `src/frontend/` | Copy `.env.example` to `.env` and restart `npm run dev` |
| Port 8000 already in use | Another process bound to 8000 | `python -m uvicorn backend.app.main:app --port 8001` and update `VITE_API_BASE_URL` |

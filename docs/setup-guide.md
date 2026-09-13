# Setup Guide — PortFlow AI

> **Status (Plan 2):** Backend and frontend skeleton are implemented.
> The health endpoint is functional.  Database, ML, and optimiser code is
> not yet implemented (Plans 3–5).
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
DATABASE_URL=postgresql://portflow:portflow_dev@localhost:5432/portflow
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
ENVIRONMENT=development
RANDOM_SEED=42
REROUTE_THRESHOLD=0.7
```

**Required environment variables:**

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — (required) |
| `SECRET_KEY` | JWT signing key | — (required) |
| `ENVIRONMENT` | `development` or `production` | `development` |
| `RANDOM_SEED` | Seed for synthetic data generation and ML reproducibility | `42` |
| `REROUTE_THRESHOLD` | Congestion risk score threshold for routing recommendations | `0.7` |

```bash
# Run database migrations (Plan 3+)
# alembic upgrade head

# Seed synthetic data (Plan 4+)
# python -m app.data.seed

# Start the backend API server (from src/)
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

**Health check (Plan 2 and later):**

```bash
curl http://localhost:8000/api/v1/health
# Expected: {"status": "healthy", "service": "portflow-api", "version": "0.1.0"}
```

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

## 4. ML Model Training

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

## 5. Running Tests

```bash
# Backend unit and integration tests (from src/)
python -m pytest backend/tests -q

# Frontend type check (from src/frontend/)
npm run typecheck

# Frontend lint (from src/frontend/)
npm run lint
```

---

## 6. Building for Production

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

## 7. Deployment (Pending)

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

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `alembic upgrade head` fails | `DATABASE_URL` not set or DB not running | Check `.env` and confirm PostgreSQL is reachable |
| `ModuleNotFoundError` on backend start | Virtual environment not activated | Run `.venv\Scripts\Activate.ps1` (Windows) or `source .venv/bin/activate` |
| `VITE_API_URL` not applied | `.env` file missing in `src/frontend/` | Copy `.env.example` to `.env` and restart `npm run dev` |
| Model `.joblib` file missing | Training script not run | Run `python -m app.ml.train` |
| Port 8000 already in use | Another process bound to 8000 | `uvicorn app.main:app --port 8001` and update `VITE_API_URL` |
| CP-SAT solver returns INFEASIBLE | Constraint conflict in test data | Check that berth count ≥ concurrent vessel arrivals in seed data |

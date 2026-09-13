# src/ — Application Source Code

All PortFlow AI application code lives under this directory.

**Plan 3 status:** SQLAlchemy ORM models, Alembic migrations, and synthetic data generator implemented.

---

## Directory Structure

```
src/
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/health.py   # GET /api/v1/health
│   │   ├── core/config.py     # pydantic-settings (Settings class)
│   │   ├── core/errors.py     # Global exception handlers
│   │   ├── models/            # SQLAlchemy 2 ORM models (Plan 3)
│   │   │   ├── port.py
│   │   │   ├── vessel.py
│   │   │   ├── berth.py
│   │   │   ├── crane.py
│   │   │   ├── vessel_schedule.py
│   │   │   └── historical_operation.py
│   │   ├── schemas/           # Pydantic v2 schemas (Plan 4)
│   │   ├── ml/                # scikit-learn inference (Plan 4)
│   │   ├── optimiser/         # OR-Tools CP-SAT (Plan 5)
│   │   ├── mcp_server/        # PortFlow MCP server (Plan 6)
│   │   ├── dependencies.py    # SQLAlchemy session factory (Plan 3)
│   │   └── main.py            # FastAPI app factory
│   ├── tests/
│   │   ├── test_health.py     # Health endpoint tests
│   │   └── test_database.py   # ORM, constraint, and seed tests (Plan 3)
│   ├── requirements.txt
│   └── .env.example
├── database/                   # Alembic configuration (Plan 3)
│   ├── alembic.ini
│   └── migrations/
│       ├── env.py
│       └── versions/
│           └── 0001_initial_schema.py
├── data/                       # Synthetic data (Plan 3)
│   ├── generator.py            # Deterministic scenario generator
│   ├── seed.py                 # Database seeder (idempotent)
│   ├── raw/                    # Raw input data (gitignored except .gitkeep)
│   └── processed/              # Processed data (gitignored except .gitkeep)
├── frontend/                   # React + Vite + TypeScript (Plan 2)
│   └── src/
│       ├── App.tsx             # Router with 7 routes
│       ├── components/         # Shell, Sidebar, EmptyState
│       ├── pages/              # 7 route pages
│       ├── hooks/              # useApiHealth
│       └── services/           # apiFetch wrapper
├── ml/                         # Standalone ML scripts (Plan 4)
├── optimizer/                  # Standalone solver scripts (Plan 5)
├── mcp-server/                 # Standalone MCP server (Plan 6)
├── tests/                      # Integration tests
├── .env.example                # Index pointing to sub-module examples
├── pytest.ini
└── README.md                   # This file
```

---

## Quick Commands

All commands run from `src/`:

```bash
# Activate virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Run database migrations
python -m alembic -c database/alembic.ini upgrade head

# Check current migration
python -m alembic -c database/alembic.ini current

# Seed synthetic demo data (idempotent)
python -m data.seed

# Re-seed from scratch (dev/test only)
python -m data.seed --reset

# Start the API server
python -m uvicorn backend.app.main:app --reload --port 8000

# Run all backend tests
python -m pytest backend/tests -v

# Health check
curl http://localhost:8000/api/v1/health
```

---

## Synthetic Data Disclosure

All data seeded by `python -m data.seed` is **entirely synthetic and fictional**.

- Port name: "Port of Falkermere" — **not a real port**
- Vessel names (e.g. "FALKERMERE ATLAS") — **not real vessels**
- IMO numbers (e.g. "IMO9000001") — **fictional, not real IMO registry entries**
- All records have `is_synthetic = true`
- Data is reproducible: `SYNTHETIC_DATA_SEED=2026` (configurable)
- No real port operator data, AIS feeds, customer data, or personal information

Five scenarios are generated: `baseline`, `arrival_surge`, `crane_outage`,
`berth_closure`, and `handling_slowdown`.

---

## Environment Setup

```bash
# 1. Copy and edit backend environment file
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL to your PostgreSQL connection string

# 2. Copy and edit frontend environment file
cp frontend/.env.example frontend/.env
# Default VITE_API_BASE_URL=http://localhost:8000/api/v1 usually works
```

See `docs/setup-guide.md` for full prerequisites and troubleshooting.

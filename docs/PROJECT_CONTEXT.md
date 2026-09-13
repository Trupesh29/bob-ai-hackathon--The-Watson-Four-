# Project Context — PortFlow AI

**Track:** AI  |  **Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser  
**Repository:** `bob-ai-hackathon-portflow-ai` (URL pending — see `submission.yaml`)  
**Hackathon:** IBM Bobathon 2026

---

## Purpose of This Document

This document provides the authoritative context for all AI-assisted
development sessions.  Every IBM Bob task and every pull request should be
consistent with the decisions recorded here.

---

## Problem in One Sentence

Port shift supervisors at a single container terminal cannot predict berth
congestion before it occurs, so they cannot pre-emptively optimise berth and
crane assignments or generate an explainable, human-approved 72-hour plan.

---

## Primary User

**Port shift supervisor** — single container terminal, 12-hour duty window.

The supervisor must:
1. See predicted congestion hotspots and vessel waiting times before vessels arrive.
2. Review an optimised 72-hour berth and crane assignment plan side-by-side with the baseline.
3. Understand the reasoning behind any risk score or plan recommendation.
4. Explicitly approve or reject routing changes and plan proposals.
5. Hand off an approved plan at shift change.

---

## Approved Technology Decisions

All technology decisions in this table are **final for MVP**.  Do not propose
alternatives without updating this document and recording the change in
`docs/AI_HANDOFF.md`.

| Decision | Chosen option | Rationale |
|---|---|---|
| Frontend framework | React 18 + Vite + TypeScript | Industry standard; Bobathon community support |
| Styling | Tailwind CSS | Rapid utility-first layout |
| Charts | Recharts | React-native; only when a real feature requires it |
| Maps | Leaflet | Lightweight; only when a real feature requires it |
| Backend language | Python 3.12 | ML ecosystem; FastAPI alignment |
| Backend framework | FastAPI 0.111+ | Async, OpenAPI docs, Pydantic v2 integration |
| Data validation | Pydantic v2 | FastAPI native; strict mode available |
| ORM | SQLAlchemy 2 | Mature; Alembic migration support |
| Database | PostgreSQL 15+ | Relational; production-ready |
| ML library | scikit-learn | Reproducible; Joblib serialisation |
| Optional ML | XGBoost | Only if cross-validated RMSE measurably improves |
| ML serialisation | Joblib | Standard for scikit-learn pipelines |
| Optimisation | OR-Tools CP-SAT | Google-maintained; handles binary integer programs |
| AI tool | IBM Bob | Hackathon requirement; MCP server for explanations |

**Prohibited for MVP:** IoT, AIS live feeds, Kafka, Kubernetes, microservices,
blockchain, Redis, Celery, Spark, Hadoop, GraphQL.

---

## Hard Constraints

1. **Human approval is required** before any routing or plan change is
   activated.  No LLM may approve a plan.
2. **IBM Bob / LLM must not** calculate berth or crane assignments, fabricate
   predictions, or generate numerical schedules.
3. **All data is synthetic and seed-driven** until operational port data with
   appropriate permissions is available.
4. **The official validator (`validate.yml`) must not be modified.**
5. **All application code lives under `src/`.**
6. **Do not document deployment URLs until a working public URL exists.**

---

## Code Structure Contract

```
src/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/        # API client functions
│   │   └── types/           # TypeScript interfaces
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── package.json
│   └── .env.example
└── backend/
    ├── app/
    │   ├── api/
    │   │   └── v1/          # Route handlers (vessels, berths, predictions, plans, routing)
    │   ├── models/          # SQLAlchemy ORM models
    │   ├── schemas/         # Pydantic v2 request/response schemas
    │   ├── ml/
    │   │   ├── train.py     # Training pipeline
    │   │   ├── infer.py     # Inference pipeline
    │   │   └── models/      # Serialised .joblib artefacts
    │   ├── optimiser/
    │   │   └── cpsat.py     # OR-Tools CP-SAT solver
    │   ├── data/
    │   │   ├── generate_synthetic.py
    │   │   └── seed.py      # Database seeder
    │   ├── core/
    │   │   ├── config.py    # Settings from environment variables
    │   │   └── security.py  # JWT utilities
    │   └── main.py          # FastAPI app factory
    ├── alembic/
    ├── tests/
    ├── requirements.txt
    ├── alembic.ini
    └── .env.example
```

---

## Risk Score and Threshold Policy

| Parameter | Default value | Config variable |
|---|---|---|
| Congestion risk score range | 0.0 – 1.0 | — |
| High-risk threshold (display warning) | ≥ 0.5 | `RISK_WARN_THRESHOLD` |
| Routing recommendation threshold | ≥ 0.7 | `REROUTE_THRESHOLD` |
| Maximum waiting time displayed as "acceptable" | ≤ 2 hours | `MAX_ACCEPTABLE_WAIT_HOURS` |

These thresholds are configurable via environment variables.  Changing them
does not require a code change.

---

## UTC Policy

All timestamps stored in the database and returned from the API are in UTC.
The frontend converts UTC to the local browser timezone for display only.
No timezone conversion occurs in the backend.

API timestamp fields use ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`.

---

## Synthetic Data Assumptions

| Parameter | Value |
|---|---|
| Random seed | 42 (configurable via `RANDOM_SEED`) |
| Planning horizon | 72 hours |
| Number of berths | 6 |
| Number of cranes | 12 (2 per berth) |
| Vessel arrivals per 72-hour window | 20–40 |
| Vessel TEU range | 500 – 18,000 |
| Base congestion rate | ~30% of windows show risk score > 0.5 |

These values can be overridden in `src/backend/app/data/generate_synthetic.py`.

---

## IBM Bob Session Convention

Every significant IBM Bob task should be exported to `bob_sessions/`:
- Markdown task history: `bob_sessions/task-<N>-<slug>.md`
- Task-consumption screenshot: `bob_sessions/task-<N>-<slug>-screenshot.png`

See `bob_sessions/README.md` for detailed instructions.

---

## Document Hierarchy

When documents conflict, precedence is:

1. `docs/AI_HANDOFF.md` — most recent session decisions
2. `docs/PROJECT_CONTEXT.md` — this document (stable decisions)
3. `docs/API_CONTRACT.md` — endpoint and schema contract
4. `docs/DATA_DICTIONARY.md` — field definitions
5. `docs/DEFINITION_OF_DONE.md` — acceptance criteria
6. All other docs

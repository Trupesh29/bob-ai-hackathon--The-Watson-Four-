# Contributing to PortFlow AI

Thank you for contributing to PortFlow AI.  This guide covers the conventions
and constraints that apply to all contributions.

---

## Project Overview

PortFlow AI is an IBM Bobathon 2026 submission for Problem L1 —
Container Congestion Predictor & Port Operations Optimiser.

**Primary user:** Port shift supervisor, single container terminal.  
**Track:** AI.

All contributions must remain consistent with the architecture and API contract
documented in `docs/`.

---

## Hard Constraints

Before making any change, review the constraints in `docs/PROJECT_CONTEXT.md`.
Key rules:

1. **All application code lives under `src/`.**  No source files belong at the
   repository root.

2. **Human approval is required** before any routing or plan change is activated.
   Do not bypass or remove the approval gate.

3. **IBM Bob / LLM must not** calculate berth or crane assignments, fabricate
   predictions, or approve operations plans.

4. **The official validator (`.github/workflows/validate.yml`) must not be
   modified.**

5. **All data used in development is synthetic and seed-driven.**  Do not
   commit real port operational data, personal information, or confidential data.

6. **Do not document deployment URLs until a working public URL exists.**  Use
   `*_PENDING` markers.

7. **Do not broaden the MVP** with IoT, AIS live feeds, Kafka, Kubernetes,
   microservices, blockchain, Redis, Celery, Spark, Hadoop, or GraphQL.

---

## Technology Stack

See `docs/architecture.md` for the full technology table.  Do not introduce
new dependencies without updating `docs/PROJECT_CONTEXT.md` and recording the
change in `docs/AI_HANDOFF.md`.

---

## Development Workflow

1. Read `docs/AI_HANDOFF.md` to understand the current state and the next task.
2. Read `docs/API_CONTRACT.md` before implementing or changing any endpoint.
3. Read `docs/DATA_DICTIONARY.md` before adding or changing any database column.
4. Read `docs/DEFINITION_OF_DONE.md` before marking any feature complete.
5. Run validation before pushing:

```bash
# Backend
cd src/backend
pytest tests/ -v
# (once implemented)

# Frontend
cd src/frontend
npm run typecheck
npm run lint
npm run build
# (once implemented)

# Repository
git diff --check
```

6. Update `docs/AI_HANDOFF.md` with completed work, changed files, and next task.

---

## Commit Message Convention

```
<type>: <short description>

Types: feat | fix | docs | refactor | test | chore
```

Examples:
```
feat: add vessel waiting-time prediction endpoint
docs: align API contract with CP-SAT solver output schema
fix: correct UTC timestamp handling in berth_assignments
```

---

## File Naming

| Location | Convention |
|---|---|
| Python modules | `snake_case.py` |
| TypeScript/React components | `PascalCase.tsx` |
| TypeScript utilities/hooks | `camelCase.ts` |
| Documentation | `UPPER_SNAKE_CASE.md` or `kebab-case.md` |
| Bob session exports | `task-<N>-<slug>.md` and `task-<N>-<slug>-screenshot.png` |

---

## Secrets Policy

- Never commit real credentials, API keys, passwords, or database connection
  strings containing passwords.
- Use environment variables for all secrets.
- Keep `.env` files out of version control (`.gitignore` covers them).
- `.env.example` files document required variables with placeholder values only.
- Before committing Bob session exports, search for credential patterns:

```bash
grep -rn "password\|api_key\|secret\|token\|Bearer\|postgres://" bob_sessions/
```

---

## Documentation Updates

When changing code, update the relevant contract documents:

| Change | Document to update |
|---|---|
| New or changed endpoint | `docs/API_CONTRACT.md` |
| New or changed DB column | `docs/DATA_DICTIONARY.md` |
| New ML feature | `docs/DATA_DICTIONARY.md` |
| New dependency | `docs/PROJECT_CONTEXT.md` + `docs/architecture.md` |
| New threshold/config var | `docs/PROJECT_CONTEXT.md` + `docs/DATA_DICTIONARY.md` |
| Completed task | `docs/AI_HANDOFF.md` |

---

## Do Not

- Create fake demo videos, screenshots, or Bob session exports.
- Invent team member names or emails.
- Commit or push to the public repository without a human review of the diff.
- Submit the official hackathon form without team review.

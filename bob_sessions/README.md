# Bob Sessions — PortFlow AI

This directory contains exported IBM Bob task histories and task-consumption
screenshots for PortFlow AI development.  These artefacts are required as
evidence of IBM Bob usage for the IBM Bobathon submission.

---

## Export Instructions

For every significant IBM Bob task related to PortFlow AI:

### Step 1 — Export the Markdown task history

1. In IBM Bob, open the completed task.
2. Use the export/share function to download the task history as Markdown.
3. Save the file as:
   ```
   bob_sessions/task-<N>-<short-slug>.md
   ```
   where `<N>` is a sequential number and `<short-slug>` is a brief description
   (e.g. `task-01-plan1-docs`, `task-02-backend-scaffold`).

### Step 2 — Capture the task-consumption screenshot

1. In IBM Bob, navigate to the task-consumption summary for the task.
2. Take a screenshot showing the task title, token/credit usage, and completion status.
3. Save the screenshot as:
   ```
   bob_sessions/task-<N>-<short-slug>-screenshot.png
   ```

### Step 3 — Remove credentials before committing

⚠️ **Credential-removal warning:**

Before committing any exported file, check it for:
- API keys, passwords, or tokens (even partial strings)
- Database connection strings containing passwords
- Personal email addresses not already public
- Internal system hostnames or IP addresses

Replace any such content with `[REDACTED]` before committing.  Use
`git diff --check` and a text search for common patterns:

```bash
# Search for common credential patterns before committing
grep -rn "password\|api_key\|secret\|token\|Bearer\|postgres://" bob_sessions/
```

---

## Naming Convention

| File | Description |
|---|---|
| `task-<N>-<slug>.md` | Exported Markdown task history |
| `task-<N>-<slug>-screenshot.png` | Task-consumption summary screenshot |

Example session index:

| # | Slug | Task description | Status |
|---|---|---|---|
| 01 | plan1-docs | Plan 1: Documentation and submission baseline | Pending export |
| 02 | plan2-backend | Plan 2: Backend scaffold and DB models | Not started |
| 03 | plan3-ml | Plan 3: ML training pipeline | Not started |
| 04 | plan4-cpsat | Plan 4: CP-SAT optimiser integration | Not started |
| 05 | plan5-frontend | Plan 5: Frontend application | Not started |
| 06 | mcp-demo | MCP server explanation demonstration | Not started |

---

## Important Notes

- **Never fabricate Bob session evidence.**  Only export sessions that actually
  occurred.  Do not create fake `.md` files or screenshots.
- **Both artefacts are required** for each session: the Markdown history AND
  the screenshot.  A screenshot without the history, or vice versa, is
  incomplete.
- **The task-consumption screenshot** must show the IBM Bob interface — not a
  code editor or terminal.  It should be recognisable as IBM Bob activity.
- Sessions must represent real development work on PortFlow AI, not generic
  or unrelated tasks.

---

## Current Sessions

*(No sessions exported yet — application development has not started.  Export
Plan 1 task history after this documentation session.)*

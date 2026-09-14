# Problem Statement — PortFlow AI

**IBM Bobathon Track:** AI  
**Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser  
**Primary User:** Port shift supervisor, single container terminal

---

## Operational Context

A port shift supervisor oversees all vessel arrivals, berth allocations, and
crane assignments within a 12-hour duty window at a single container terminal.
Vessel arrival schedules are known in advance but subject to variability caused
by weather, upstream port delays, and voyage routing decisions.  Berth capacity
is a hard physical constraint: only a fixed number of berths exist, each with a
maximum crane complement and a rated container throughput.

During a busy period — a cluster of high-capacity vessels arriving within the
same tidal window, for example — the terminal can accumulate a waiting queue
where vessels sit at anchor burning fuel and accruing port-delay penalties
before a berth becomes available.  This situation is colloquially called a
**congestion event**.

---

## The Pain Point

**Spreadsheets and intuition are the current decision support.**  The shift
supervisor typically works from a printed schedule and a shared spreadsheet
updated by hand.  The following problems result:

| Problem | Why it matters |
|---|---|
| No quantified congestion warning | Congestion is recognised only when vessels are already queueing; re-sequencing becomes reactive and costly |
| Manual berth and crane allocation | Assignments are made by experience, not by optimisation; berth or crane idle time is not minimised |
| No waiting-time estimate | The supervisor cannot communicate a reliable ETA to vessel agents or port logistics teams |
| No alternate routing trigger | When congestion is foreseeable, diverting low-priority vessels to alternate berths or the next window is not systematically evaluated |
| Manual 72-hour plan assembly | Each shift plan is assembled from scratch; there is no baseline that can be reviewed, adjusted, and approved in minutes |

**Prediction-only dashboards do not solve the problem.**  A tool that shows a
congestion probability score without suggesting an actionable plan still leaves
the supervisor to decide manually what to do about it.  The gap is not
awareness — it is the absence of an optimised, explainable, human-approved
action plan.

---

## Why Existing Tools Fall Short

1. **Spreadsheets** cannot hold an optimisation model.  They require manual
   data entry, do not enforce constraint logic (e.g., maximum berth occupancy),
   and produce no quantified forecast.

2. **Prediction-only dashboards** improve situational awareness but provide no
   assignment recommendations.  The supervisor still allocates berths and cranes
   manually after seeing the alert.

3. **Generic scheduling software** is not trained on port-specific congestion
   patterns and does not jointly optimise berths and cranes as a coupled
   resource-allocation problem.

4. **Unaided LLM assistants** cannot safely be trusted to calculate operational
   schedules because they may hallucinate numerical values and cannot be held
   accountable for consequential port decisions.

---

## Proposed Solution Outcome

PortFlow AI addresses each gap:

| Gap | Solution |
|---|---|
| No congestion warning | ML model predicts congestion risk score and vessel waiting time from vessel schedules and berth capacity |
| No optimised assignment | CP-SAT solver produces jointly optimised berth and crane assignments |
| No waiting-time estimate | Regression model outputs a waiting-time forecast with confidence range |
| No routing trigger | System recommends alternate routing when the optimised plan shows a net operational benefit |
| Manual plan assembly | System generates a 72-hour operations plan; supervisor reviews and approves before it takes effect |
| Opaque model outputs | IBM Bob (MCP, read-only) explains risk causes and plan summaries in plain language |

---

## Testable Success Criteria

A minimum viable product passes when all of the following are true:

1. **Congestion prediction:** Given a synthetic 72-hour vessel-arrival schedule
   and berth-capacity constraints, the ML model outputs a congestion risk score
   and a vessel waiting-time estimate for each vessel, and the predictions are
   reproducible given the same random seed.

2. **Optimised plan:** The CP-SAT solver produces a berth and crane assignment
   plan that satisfies all hard constraints (berth capacity, crane availability)
   and minimises total vessel waiting time compared with a first-come-first-served
   baseline.

3. **Human approval gate:** No routing change or plan change is recorded in the
   database as "active" until the shift supervisor has explicitly confirmed it
   through the UI approval action.

4. **Explanation via IBM Bob:** At least one Bob task session demonstrates the
   MCP server returning a plain-language risk explanation that references real
   prediction output — not fabricated numbers.

5. **Synthetic data traceability:** All test data can be regenerated
   deterministically from documented seeds and generation scripts in
   `src/backend/data/`.

---

## Out of Scope for MVP

- Live AIS vessel-tracking integration
- Multi-terminal or multi-port coordination
- IoT sensor feeds, Kafka streaming, Kubernetes, Redis, Celery, or GraphQL
- Blockchain provenance or social-media data feeds
- Automatic execution of routing changes without supervisor approval

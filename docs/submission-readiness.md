# Submission Readiness — Guideline Review

Reviewed 16 September 2026 against the user-supplied Bobathon_Submission_Template_Guide.pdf. This is a documentation/artifact check, not a fresh full application QA.

| Guide item | Current result |
|---|---|
| Template top-level paths and CONTRIBUTING | Present; preserved |
| Team metadata | Confirmed team/lead/member names and lead email added; optional member emails not supplied |
| Guide-compatible YAML | team, submission, artifacts sections added; legacy fields retained for current validator |
| README | Current implemented features, team, setup, demo, limitations, and strongest contribution documented |
| Problem/solution documents | Present with project-specific content |
| Architecture | Corrected to actual routes, six ORM tables, SVG map, and ephemeral plan approval |
| Setup guide and environment examples | Incorrect paths/training commands corrected; settings indexed; clean rehearsal still pending |
| Source code | Present under src/ |
| Video link | User-provided Drive URL added; playback, duration, contents, and public view-only permissions not independently verified |
| Live demo | NOT DEPLOYED; permitted by the guide |
| Three app screenshots | MISSING: capture real running input/dashboard/result pages; no fake captures added |
| Presentation | Team-provided 10-slide slides.pptx copied unchanged; file integrity verified |
| IBM Bob evidence | Genuine exports pending from team; no fabricated activity |
| Existing workflow | Unmodified; local metadata/path checks are not proof of a green remote Actions run |
| Repository public/template provenance | Not independently confirmed; no history rewrite or repository recreation performed |
| Secrets/generated artifacts | Tracked filenames checked; examples only, no generated dependencies/models intended for commit; not a complete historical secret audit |
| Submission form / deadline | Not verified or submitted; recorded deadline was 15 September 2026, timezone unconfirmed |

## Remaining actions

- Confirm Drive access in a signed-out/incognito window and verify a 3–5 minute real demo.
- Add at least three screenshots from the running app, named sequentially under demo/screenshots/.
- Supply genuine Bob task histories and consumption screenshots.
- Rehearse corrected setup and the full user flow; backend/ML QA was interrupted previously.
- Review slides, commit intended changes normally, and push; confirm public repository access and remote validator status. The prior four application edits remain uncommitted and were not retested here.
- Confirm with the organiser whether updates after the recorded deadline are accepted, and verify the entry form status.

Prior checks: 84 frontend tests passed; frontend production build and MCP build passed; frontend npm audit returned zero vulnerabilities. Lint retained five errors and nine warnings. These results are from the earlier interrupted QA, not tests run during this guideline check.

Final status: NOT READY for a fully verified guideline-complete submission until the missing genuine screenshots, access checks, and setup rehearsal are completed.

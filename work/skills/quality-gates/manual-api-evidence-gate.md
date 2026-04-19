---
id: manual-api-evidence-gate
title: Manual API evidence gate
category: quality-gates
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
---

# Manual API evidence gate

## Pass criteria

- `qa/test-<feature>.sh` exists
- Script exits 0
- Script covers: happy + 400 + 401 + 403 + 404 + 409 (where applicable)
- DB verified via psql
- Docker logs show 0 critical errors
- Evidence file `.claude/Integrations/<feature>__QA_output.md` saved

## Fail criteria

- No QA script
- Any script assertion fails
- DB not verified
- Docker logs contain `FATAL` / `UnhandledPromiseRejection`

## Evidence required

- Script content (gitignored but referenceable)
- Script stdout showing all PASS
- DB query results
- Docker log tail

## Blocker severity

**HARD BLOCKER.**

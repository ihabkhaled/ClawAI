---
id: qa-expectations
title: QA expectations
category: foundations
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
  - platform-team
---

# QA expectations

## Purpose

Unit tests prove behavior in isolation. QA scripts prove the whole feature works end-to-end with real DB, real HTTP, real container logs. Every feature ships with a runnable QA script. No exception.

## When to use

- Every new feature.
- Every substantial refactor that changes external behavior.

## Inputs required

- `docs/16-quality-engineering/API_TESTING_STANDARD.md`
- Example: `qa/test-ollama-discovery.sh`

## Workflow

1. Create `qa/test-<feature>.sh` (gitignored — script stays local).
2. Implement all 6 sections:
   - **Cleanup** — remove prior QA state so script is idempotent
   - **Auth** — log in as admin, capture token
   - **Feature tests** — every endpoint: happy + 400 + 401 + 403 + 404 + 409 where applicable
   - **DB verification** — `docker exec … psql -tAc "SELECT …"` after every write
   - **Docker log check** — grep for `UnhandledPromiseRejection|FATAL|ERR_MODULE_NOT_FOUND`
   - **Summary** — pass/fail count, exit 1 on any failure
3. Run the script: `bash qa/test-<feature>.sh`
4. Iterate until 0 failures.
5. Save evidence to `.claude/Integrations/<feature>__QA_output.md`.

## Strict rules

- **MUST** write a `qa/test-<feature>.sh` for every new feature. **BLOCKER** if missing.
- **MUST** achieve 0 failures before declaring done. **BLOCKER**.
- **MUST** verify every write operation via psql. **BLOCKER**.
- **MUST** check Docker logs for critical errors. **BLOCKER**.
- **MUST** make the script idempotent (re-runnable without state corruption).
- **MUST NOT** commit `qa/` to the repo (it's gitignored).

## Anti-patterns

- QA script with only happy paths.
- Skipping DB verification because "the API returned 200".
- Testing with a user that happens to already exist — script not idempotent.
- Claiming done with 3 known failures "for later".

## Validation checklist

- [ ] `qa/test-<feature>.sh` exists
- [ ] Cleanup section removes prior QA state
- [ ] Every endpoint has happy + at least one negative assertion
- [ ] Every write is verified in DB
- [ ] Docker log check present
- [ ] Exit code 0 on pass, 1 on fail
- [ ] Script runs twice back-to-back with same result (idempotent)

## Quality gate

| Check                                                        | Blocker? | Evidence             |
| ------------------------------------------------------------ | -------- | -------------------- |
| `bash qa/test-<feature>.sh` exits 0                          | yes      | Stdout with all PASS |
| 0 critical errors in Docker logs                             | yes      | Script output        |
| Evidence file `.claude/Integrations/<feature>__QA_output.md` | yes      | File present         |

## Test requirements

N/A — this skill IS the test requirement for the overall feature.

## Definition of done

1. QA script exists and runs locally.
2. 0 failures.
3. DB verified.
4. Docker logs clean.
5. Evidence saved.

## Examples

- `qa/test-ollama-discovery.sh` — 54 assertions across 18 areas.
- `qa/test-agent-service.sh` — 59 assertions across 14 areas.

## References

- `CLAUDE.md` — Phase 9: Real QA Execution
- `docs/16-quality-engineering/API_TESTING_STANDARD.md`
- `e2e-manual-testing/manual-api-testing.md`

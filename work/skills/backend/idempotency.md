---
id: idempotency
title: Idempotency
category: backend
level: recommended
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Idempotency

## Purpose

Retries happen. Two clicks happen. Network blips happen. Operations that can't tolerate running twice become production incidents.

## Workflow

1. For every write, ask: "What if this runs twice?"
2. Prefer upsert over create-if-not-exists.
3. Use unique constraints in DB to reject duplicates at the storage layer.
4. For external calls, use idempotency keys where the provider supports them.
5. Atomic state transitions via `updateMany({ where: { id, status: EXPECTED } })` to prevent double-execution.
6. For async jobs, check "already in progress" before starting.

## Strict rules

- **MUST** design writes to tolerate duplicate calls.
- **MUST** use unique constraints for resources that must not duplicate.
- **MUST NOT** rely on client-side dedup alone.

## Anti-patterns

- Two POSTs creating two identical rows.
- Pull job that starts twice when user double-clicks.
- Cron job that can't resume after a crash.

## Validation checklist

- [ ] Writes are idempotent
- [ ] Unique constraints cover the resource
- [ ] Jobs check "already running"
- [ ] QA script runs operations twice — same result

## Quality gate

| Check                  | Blocker? | Evidence         |
| ---------------------- | -------- | ---------------- |
| Double-run QA succeeds | yes      | QA script output |

## Definition of done

1. Duplicate calls produce the same state.
2. DB has the right constraints.
3. QA verifies.

## Examples

- `apps/claw-ollama-service/src/modules/ollama/ollama.service.ts` → `pullFromCatalog` checks active job before starting.

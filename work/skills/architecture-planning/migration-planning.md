---
id: migration-planning
title: Migration planning
category: architecture-planning
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Migration planning

## Purpose

A bad migration takes down a service or loses data. Migrations must be additive, reversible, and tested locally before reaching prod.

## When to use

- Any Prisma schema change.

## Workflow

1. Design the change additively: add columns with defaults, never drop columns in the same migration.
2. If renaming, split into two migrations: (1) add new column, backfill, (2) drop old column after all callers updated.
3. Run `npx prisma migrate dev --name <name>` locally against a non-prod DB.
4. Verify migration applied via `docker exec … psql -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='…';"`.
5. Test the code with the new schema.
6. Test that the OLD code still works with the new schema (during rolling deploy).
7. Document in the plan: what changes, why, rollback SQL.

## Strict rules

- **MUST** use `prisma migrate dev` — never hand-write migrations unless unavoidable.
- **MUST** make additive changes only; split renames into two migrations.
- **MUST** verify migration applies locally before committing.
- **MUST NOT** drop columns with data without an explicit migration plan approved by the owner.
- **MUST** include the migration file in the same PR as the schema change.

## Anti-patterns

- Migration that DROPs a column that the OLD version of the service still reads.
- Running migration only against dev DB, not against a DB that has real data.
- Adding a `NOT NULL` column without a default to an existing table.

## Validation checklist

- [ ] Migration is additive (no destructive ops)
- [ ] Columns with data are not dropped
- [ ] Locally applied and verified
- [ ] Old code compatible with new schema
- [ ] Rollback SQL documented

## Quality gate

| Check                  | Blocker? | Evidence                  |
| ---------------------- | -------- | ------------------------- |
| Migration file present | yes      | `prisma/migrations/` diff |
| Locally applied        | yes      | psql output               |
| Additive only          | yes      | Reviewer                  |

## Definition of done

1. Migration file in repo.
2. Applied locally.
3. Old-code compat verified.
4. Rollback SQL documented.

## Examples

- `apps/claw-ollama-service/prisma/migrations/20260419155106_ollama_dynamic_discovery/migration.sql` — additive only: 3 new tables, 5 new columns on existing table.

## References

- `CLAUDE.md` — Phase 3 (Prisma schema)

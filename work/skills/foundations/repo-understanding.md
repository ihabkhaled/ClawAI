---
id: repo-understanding
title: Repo understanding
category: foundations
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Repo understanding

## Purpose

Every AI agent must internalize what ClawAI is made of before making any change. Without a shared map, agents invent patterns, duplicate services, or break cross-service contracts.

## When to use

- Every new task. No exceptions.
- Onboarding a new agent or human.
- Before proposing any architectural change.

## Inputs required

- Read access to `/`
- Read `CLAUDE.md` (root) and `docs/04-backend/services-index.md`

## Workflow

1. Read `CLAUDE.md` sections: Architecture at a Glance, Workspace Layout, Nginx Route Map, Event Bus, Data Models.
2. Read `docs/04-backend/services-index.md` for the authoritative service catalog.
3. Run `./scripts/claw.sh status` if the environment is up — observe which services are live.
4. Map the task to the affected services before editing anything.

## Strict rules

- **MUST** locate the target service(s) before editing. **BLOCKER** if editing the wrong service.
- **MUST** respect service ownership — each service owns its database.
- **MUST NOT** cross database boundaries directly — use HTTP or RabbitMQ.
- **MUST NOT** duplicate logic that already exists in a shared package (`packages/shared-*`).

## Anti-patterns

- Editing a file in `claw-chat-service` when the logic belongs in `claw-memory-service` because you didn't read the service map.
- Adding a new Redis key without documenting it in the service's README.
- Adding a cross-service Prisma query (services own their DBs).

## Validation checklist

- [ ] I can name the service(s) this change affects
- [ ] I can name the port(s) they listen on
- [ ] I know which database they own
- [ ] I know what events (if any) they publish or consume
- [ ] I know the nginx route that fronts them (if user-facing)

## Quality gate

| Check                                     | Blocker?                      | Evidence                            |
| ----------------------------------------- | ----------------------------- | ----------------------------------- |
| Service identification documented in plan | yes (for non-trivial changes) | Plan doc in `.claude/Integrations/` |
| No cross-DB writes introduced             | yes                           | Code review                         |

## Test requirements

No direct test obligations — this skill feeds downstream skills.

## Definition of done

1. Every affected service is named in the plan.
2. Event bus impact is documented (published, consumed, or "none").
3. Nginx route impact is documented.

## Examples

- `.claude/Integrations/ollama-dynamic-discovery__PLAN.md` — lists affected services, events, DBs.

## References

- `CLAUDE.md` — Architecture at a Glance, Workspace Layout, Nginx Route Map
- `docs/04-backend/services-index.md`

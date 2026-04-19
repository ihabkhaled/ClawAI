---
id: cross-service-planning
title: Cross-service planning
category: architecture-planning
level: mandatory
depends_on:
  - architecture-planning/feature-planning
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Cross-service planning

## Purpose

Changes spanning 2+ services break more often than single-service changes. This skill enforces explicit event contracts, HTTP calls, and rollout sequencing.

## When to use

- Any change that touches 2+ services.
- Any new RabbitMQ event pattern.
- Any new inter-service HTTP endpoint.

## Workflow

1. Draw the call graph: which service publishes what, consumes what, calls what synchronously.
2. For each event: update `packages/shared-types` first, commit it, then update publisher + consumer.
3. For each new HTTP endpoint: document in `docs/03-architecture/` and add to nginx routes.
4. Determine deployment order — publisher first or consumer first.
5. Plan backward compatibility: during rollout, old and new versions coexist.
6. Plan for event replay: if consumer is down, what happens to published events?

## Strict rules

- **MUST** update `packages/shared-types` before publisher or consumer.
- **MUST** add new nginx routes in the same PR as the new endpoint.
- **MUST** document deployment order in the plan.
- **MUST NOT** do cross-DB queries — only HTTP or RabbitMQ.

## Anti-patterns

- Publishing a new event pattern without updating `shared-types`.
- Consumer updated before publisher rolls out.
- Assuming messages can't be lost.

## Validation checklist

- [ ] Call graph in plan
- [ ] `shared-types` updated
- [ ] Deployment order documented
- [ ] Backward compatibility addressed
- [ ] Nginx routes added if applicable

## Quality gate

| Check                        | Blocker? | Evidence                             |
| ---------------------------- | -------- | ------------------------------------ |
| `shared-types` updated in PR | yes      | Diff                                 |
| Nginx routes correct         | yes      | `infra/nginx/nginx.conf` diff + test |

## Definition of done

1. Call graph in plan.
2. `shared-types` updated.
3. Deployment order documented.

## References

- `CLAUDE.md` — Event Bus, Nginx Route Map
- `backend/rabbitmq-events.md`

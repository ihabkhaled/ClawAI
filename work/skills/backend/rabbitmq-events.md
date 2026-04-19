---
id: rabbitmq-events
title: RabbitMQ events
category: backend
level: mandatory
depends_on:
  - architecture-planning/cross-service-planning
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# RabbitMQ events

## Purpose

Events are the cross-service API. Mis-versioned events or unhandled DLQ messages are silent failures.

## Workflow

1. Define the event pattern in `packages/shared-types/src/events/` — constant enum value.
2. Define the payload type in `shared-types`.
3. Publisher: inject `RabbitMQService`, call `publish(pattern, payload)`.
4. Consumer: `@EventPattern(Pattern)` + service handler; accept typed payload; never throw (use try/catch that logs).
5. DLQ + 3 retries with backoff is configured at the module level — don't bypass.
6. Document the event in `docs/03-architecture/event-bus.md` + `CLAUDE.md` table.

## Strict rules

- **MUST** define patterns in `shared-types` before emitting. **BLOCKER**.
- **MUST** define payload types in `shared-types`.
- **MUST** handle errors in consumers — let DLQ be the last resort, not the norm.
- **MUST NOT** use ad-hoc string patterns.

## Anti-patterns

- Publishing a pattern not in `shared-types`.
- Consumer that throws on every malformed payload → DLQ flood.
- Payload with un-versioned fields (any future change breaks consumers).

## Validation checklist

- [ ] Pattern in `shared-types`
- [ ] Payload type in `shared-types`
- [ ] Publisher typed
- [ ] Consumer typed + error-handled
- [ ] Documented in event-bus.md + CLAUDE.md

## Quality gate

| Check                           | Blocker? | Evidence       |
| ------------------------------- | -------- | -------------- |
| Pattern in `shared-types`       | yes      | Diff           |
| Event arrives at consumer in QA | yes      | Log inspection |

## Definition of done

1. Pattern + payload in `shared-types`.
2. Publisher + consumer wired.
3. Documented.
4. QA observes the event.

## References

- `CLAUDE.md` — Event Bus

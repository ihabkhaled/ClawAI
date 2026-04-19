---
id: layer-boundaries
title: Layer boundaries
category: backend
level: mandatory
depends_on:
  - foundations/architecture-awareness
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Layer boundaries

## Purpose

Controller → Service → Repository/Manager is the law. No exceptions.

## Rules per layer

| Layer      | Can                                                                               | Cannot                               |
| ---------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| Controller | Extract params, call ONE service method, return                                   | try/catch, business logic, DB access |
| Service    | Business logic, validation, ownership checks, call repos/managers, publish events | Inline types, methods >30 lines      |
| Manager    | Multi-step orchestration, external calls, retries                                 | Methods >80 lines, complexity >15    |
| Repository | Pure Prisma/Mongoose access                                                       | Business logic, throw                |

## Strict rules

- **MUST** keep controller methods 3 lines. **BLOCKER** if violated.
- **MUST NOT** throw from repositories.
- **MUST NOT** do try/catch in controllers.
- **MUST** keep service methods ≤30 lines.
- **MUST** keep manager methods ≤80 lines / complexity ≤15.

## Validation checklist

- [ ] Controllers have 3-line methods
- [ ] Repos return data or null
- [ ] Services enforce ownership
- [ ] Managers handle orchestration only

## Quality gate

| Check                                      | Blocker? | Evidence  |
| ------------------------------------------ | -------- | --------- |
| ESLint `max-lines-per-function` = 0 errors | yes      | CI        |
| Reviewer confirms boundaries               | yes      | PR review |

## Definition of done

1. Every file respects its layer.
2. Lint green.
3. Reviewer signs off.

## References

- `CLAUDE.md` — Backend Architecture Rules

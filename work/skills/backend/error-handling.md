---
id: error-handling
title: Error handling
category: backend
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Error handling

## Purpose

Consistent error shape across services. Machine-readable codes for frontends. No 500 for business errors.

## Workflow

1. Use `BusinessException` with a `code` string for every domain error.
2. Use `EntityNotFoundException` for 404s.
3. Let `GlobalExceptionFilter` transform — never catch in controllers.
4. In services, throw early with a specific code (e.g. `DUPLICATE_CATALOG_ENTRY`, `NO_ENABLED_SOURCES`).
5. In repositories, never throw — return `null` or let Prisma error propagate.
6. In managers, wrap external failures with a clear message.

## Strict rules

- **MUST** use `BusinessException` with `code`. **BLOCKER** on bare `throw new Error`.
- **MUST NOT** catch in controllers.
- **MUST NOT** throw from repositories.
- **MUST NOT** return 500 for a client-caused error (validation, auth, not-found, conflict).
- **MUST NOT** swallow errors silently — log and rethrow or handle explicitly.

## Anti-patterns

- `throw new HttpException('bad', 500)` for a 404.
- `catch (e) { return null; }` — loses the error.
- 500 for a role mismatch (should be 403).

## Validation checklist

- [ ] Every thrown error is `BusinessException`
- [ ] Codes are stable, documented machine-readable strings
- [ ] QA asserts 400/401/403/404/409 paths
- [ ] No silent catches

## Quality gate

| Check                                       | Blocker? | Evidence  |
| ------------------------------------------- | -------- | --------- |
| No `throw new Error(...)` for domain errors | yes      | grep      |
| QA asserts error codes                      | yes      | QA script |

## Definition of done

1. Error codes documented.
2. QA asserts status codes.
3. No 500s for business errors.

## References

- `apps/claw-ollama-service/src/common/errors/business.exception.ts`
- `CLAUDE.md` — Error Handling

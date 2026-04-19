---
id: input-validation
title: Input validation
category: security
level: mandatory
applies_to:
  - backend-service
  - frontend-page
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - security-lead
---

# Input validation

## Purpose

Every trust boundary crossing validates. No validation = remote code execution, IDOR, DoS, or worse.

## Strict rules

- **MUST** validate every HTTP body, query, path param with Zod. **BLOCKER** if missing.
- **MUST** bound every string (`.max(N)`).
- **MUST** bound every array (`.max(N)`).
- **MUST** reject unknown fields (`.strict()` where tight contracts apply).
- **MUST** validate IDs are the expected shape (CUID, UUID, etc.).
- **MUST NOT** trust headers blindly (auth headers validated by the guard, never custom headers for privilege).

## Anti-patterns

- Validating in the service layer after the controller — too late.
- Using `z.string()` with no `.max()`.
- Accepting raw JSON into Prisma without a schema step.

## Validation checklist

- [ ] Every endpoint DTO validated by Zod
- [ ] All strings bounded
- [ ] All arrays bounded
- [ ] IDs format-checked

## Quality gate

| Check                              | Blocker? | Evidence  |
| ---------------------------------- | -------- | --------- |
| QA asserts 400 on oversize         | yes      | QA script |
| QA asserts 400 on missing required | yes      | QA script |

## Definition of done

1. DTO + ZodValidationPipe on every endpoint.
2. QA 400 assertions.

## References

- `backend/dto-design.md`

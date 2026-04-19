---
id: manual-api-testing
title: Manual API testing
category: e2e-manual-testing
level: mandatory
depends_on:
  - foundations/qa-expectations
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
---

# Manual API testing

## Purpose

After automated tests pass, curl every endpoint one-by-one. Automated tests mock things; manual curl hits the real stack.

## Workflow

1. Log in via `POST /api/v1/auth/login` — capture the access token.
2. For each endpoint:
   - Happy path: correct body, expect 200/201/202/204
   - Oversize body: strings beyond `.max()` → expect 400
   - Missing required: drop a field → expect 400
   - Unauthenticated: omit token → expect 401
   - Wrong role: use a non-admin token → expect 403
   - Nonexistent ID: random CUID → expect 404
   - Duplicate: same create twice → expect 409
3. Verify the response shape (fields present, secrets absent).
4. For writes, verify the DB via psql.
5. Script it: `qa/test-<feature>.sh`.

## Strict rules

- **MUST** manually curl every new endpoint before declaring done.
- **MUST** script the test so it's re-runnable.
- **MUST** verify secrets aren't in responses.

## Anti-patterns

- Relying on Swagger UI alone — doesn't test auth edge cases.
- Skipping the 403/409 paths because "the happy path works".
- Not verifying the DB state.

## Validation checklist

- [ ] Every endpoint curl'd
- [ ] Every status-code path (200, 400, 401, 403, 404, 409) asserted
- [ ] Response shape verified
- [ ] No secrets in responses
- [ ] DB verified after writes

## Quality gate

| Check                         | Blocker? | Evidence               |
| ----------------------------- | -------- | ---------------------- |
| `qa/test-<feature>.sh` passes | yes      | Script output          |
| DB verifications present      | yes      | Script content         |
| No secrets in responses       | yes      | Script grep assertions |

## Definition of done

1. Every endpoint curl-tested.
2. QA script captures it.
3. 0 failures.

## References

- `foundations/qa-expectations.md`
- `qa/test-ollama-discovery.sh` as a pattern

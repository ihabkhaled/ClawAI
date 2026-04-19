---
id: permission-matrix-validator
title: Permission matrix validator
category: bulk-validation
level: recommended
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - security-lead
  - qa-lead
---

# Permission matrix validator

## Purpose

Every role × every endpoint = a grid. Most cells should be forbidden. One wrong cell = IDOR. Automate the grid check.

## Workflow

1. For each role (ADMIN, OPERATOR, VIEWER): create a test user.
2. For each protected endpoint: assert expected status (200/403/404 depending on role policy).
3. Include negative cases: cross-tenant (user A tries user B's resource → 403/404).
4. Track the matrix in a table; any deviation = failure.

## Strict rules

- **MUST** cover every role × every mutation endpoint.
- **MUST** include cross-user access attempts.

## Validation checklist

- [ ] Every role tested against every protected endpoint
- [ ] Cross-user access attempted
- [ ] 403 enforced where expected

## Quality gate

| Check                         | Blocker? | Evidence      |
| ----------------------------- | -------- | ------------- |
| No unauthorized cell succeeds | yes      | Matrix output |

## Definition of done

1. Matrix green.
2. Evidence saved.

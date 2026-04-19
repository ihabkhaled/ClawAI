---
id: coverage-gate
title: Coverage gate
category: quality-gates
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
---

# Coverage gate

## Pass criteria

- Critical paths (auth, validation, classifiers, routing, security) ≥98% branch coverage
- Non-critical code ≥70% line coverage
- Assertions are specific (not `expect(x).toBeTruthy()` everywhere)

## Fail criteria

- Critical path <98%
- Any critical file <50%
- Coverage regression (file was >80%, now <70%)

## Evidence required

- `npm run test:cov` summary
- Coverage HTML report for critical files (attached or linked)

## Blocker severity

**HARD BLOCKER** for critical paths.
**SOFT BLOCKER** for non-critical — waivable with owner sign-off.

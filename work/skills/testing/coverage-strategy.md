---
id: coverage-strategy
title: Coverage strategy
category: testing
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
---

# Coverage strategy

## Purpose

98% line coverage with shallow assertions is worse than 75% with strong assertions. Target high coverage on critical paths; be honest about where it's impractical.

## Critical paths (MUST hit ≥98%)

- Authentication / authorization
- Secret handling (encryption, redaction)
- Validation (DTOs, Zod schemas)
- Classifiers, normalizers, deduplicators
- Routing decision logic
- Payment / billing logic (when introduced)
- Migration scripts

## Non-critical paths (pragmatic 70–85%)

- Adapter happy paths (integration tests fill the gap)
- UI rendering (component tests cover structure)
- Logging / observability glue

## Workflow

1. For critical code, aim for 98%+ branch coverage with edge + negative cases.
2. For non-critical, focus on integration tests over unit tests.
3. Run `npm run test:cov` — read the coverage report.
4. Any file below 50% on a critical path is a blocker.
5. Meaningful assertions: each test asserts a specific behavior, not a generic shape.

## Strict rules

- **MUST** target ≥98% on critical paths. **BLOCKER** below 90%.
- **MUST** write meaningful assertions — no "it returns something truthy".
- **MUST** cover negative cases, not just happy paths.

## Anti-patterns

- Coverage 98% / assertions 3 — shallow.
- Hitting a branch without asserting on the output.
- Marking code as "not critical" to avoid writing tests.

## Validation checklist

- [ ] Critical paths ≥98%
- [ ] Assertions are specific
- [ ] Negative cases present
- [ ] Coverage report reviewed

## Quality gate

| Check                       | Blocker? | Evidence           |
| --------------------------- | -------- | ------------------ |
| Critical path ≥98% coverage | yes      | `npm run test:cov` |
| No below-50% critical files | yes      | Coverage report    |

## Definition of done

1. Coverage targets hit.
2. Assertions meaningful.
3. Reviewer confirms depth.

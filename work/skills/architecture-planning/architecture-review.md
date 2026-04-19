---
id: architecture-review
title: Architecture review
category: architecture-planning
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Architecture review

## Purpose

Review the plan for architectural soundness before implementation. Catches boundary violations, missed dependencies, and design smells early when fixes are cheap.

## When to use

- Before starting implementation on medium/large features.
- When introducing new services, adapters, events, or patterns.

## Review checklist

1. **Layer boundaries** — does every new file belong to its layer correctly?
2. **Service ownership** — is each new data model owned by exactly one service?
3. **Event contracts** — are event payloads versioned via `shared-types`?
4. **Failure modes** — what happens if DB, RabbitMQ, Redis, or an external provider is down?
5. **Observability** — can on-call trace a request end-to-end?
6. **Security** — any new trust boundary? Any new secret?
7. **Testability** — is each new unit testable in isolation?
8. **Existing patterns** — is the solution reusing existing patterns, or inventing?
9. **Deletion vs addition** — is something being deleted that shouldn't? Added that shouldn't?
10. **Scale** — what's the expected load? Have we stressed the design?

## Strict rules

- **MUST** complete the review before implementation for medium/large features.
- **MUST** document review findings in the plan.
- **MUST NOT** implement around architectural smells — fix them first.

## Anti-patterns

- Reviewing after the code is written (sunk cost bias).
- Reviewing without reading similar existing code.
- Ignoring gut feelings about coupling.

## Validation checklist

- [ ] All 10 review items considered
- [ ] Findings documented
- [ ] Smells addressed before implementation

## Quality gate

| Check                              | Blocker? | Evidence  |
| ---------------------------------- | -------- | --------- |
| Review documented for medium/large | yes      | Plan file |

## Definition of done

1. Review checklist walked.
2. Findings documented.
3. Smells addressed.

## References

- `foundations/architecture-awareness.md`
- `CLAUDE.md` — Backend Architecture Rules

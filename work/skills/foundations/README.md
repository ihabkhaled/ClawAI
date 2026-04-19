# Foundations

**MANDATORY** — every AI agent loads every skill in this folder before touching any code, regardless of task. These are the baseline. If you skip foundations, your PR is blocked.

## Load order

1. [repo-understanding](repo-understanding.md) — what ClawAI is made of
2. [architecture-awareness](architecture-awareness.md) — layer boundaries
3. [coding-standards-awareness](coding-standards-awareness.md) — ESLint, enums, file layout
4. [testing-baseline](testing-baseline.md) — TDD-first, coverage
5. [security-baseline](security-baseline.md) — OWASP floor
6. [documentation-baseline](documentation-baseline.md) — docs as deliverable
7. [qa-expectations](qa-expectations.md) — QA scripts are mandatory
8. [product-awareness](product-awareness.md) — know the user
9. [requirement-validation](requirement-validation.md) — acceptance criteria
10. [definition-of-done](definition-of-done.md) — 18-item DoD

## Why mandatory

These cross-cut every task. Skipping any one is how disasters happen — unmocked secrets leak, missing i18n goes to production, untested managers break SSE flows. No exceptions.

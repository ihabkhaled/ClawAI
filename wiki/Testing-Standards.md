> **Wiki source:** [`ihabkhaled/ClawAI/testing/README.md`](https://github.com/ihabkhaled/ClawAI/blob/main/testing/README.md) on the current `main` branch.

# ClawAI Testing Standards

The prescriptive testing standards for the ClawAI monorepo (17 NestJS services +
Next.js frontend + 6 shared packages). These documents say _what good testing is_
here; the _why_ (post-mortem lessons) lives in
[`../memory/testing-strategy.md`](https://github.com/ihabkhaled/ClawAI/blob/main/memory/testing-strategy.md).

## Runners

| Layer                    | Runner           | Notes                                  |
| ------------------------ | ---------------- | -------------------------------------- |
| Backend unit/integration | **Vitest** (swc) | `*.spec.ts` co-located in `__tests__/` |
| Frontend unit/component  | **Vitest**       | `*.test.ts` / `*.spec.ts`              |
| End-to-end (browser)     | **Playwright**   | user journeys through the real UI      |

Every workspace runs **Vitest** (`vitest run`); Playwright stays for E2E. Jest was
removed from all workspaces on 2026-09-17 (ADR-099, superseding ADR-062).

## Core principles

1. **Risk-based test design, not count quotas.** Design tests from the risk surface of
   the unit. The old "20–25 API variations per endpoint" quota is an **anti-pattern** —
   it rewards padding and misses the one dangerous branch. See
   [testing-strategy](https://github.com/ihabkhaled/ClawAI/blob/main/testing/testing-strategy.md).
2. **Coverage proportional to blast radius.** Global ≥95% statements/lines/functions,
   ≥90% branches; **100% branch** on pure critical logic (schemas, mappers, permission/
   ownership decisions, query-key builders, event validators). See
   [coverage-policy](https://github.com/ihabkhaled/ClawAI/blob/main/testing/coverage-policy.md).
3. **TDD by default.** Write the failing test before the implementation.
4. **Defense in depth.** Each layer catches a different bug class; green unit gates are
   necessary, not sufficient.
5. **Verify persistence and logs, not just responses.** A 2xx is not proof.

## Index

- [Testing strategy](https://github.com/ihabkhaled/ClawAI/blob/main/testing/testing-strategy.md)
- [Unit testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/unit-testing-standard.md)
- [Integration testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/integration-testing-standard.md)
- [Backend E2E](https://github.com/ihabkhaled/ClawAI/blob/main/testing/backend-e2e-standard.md)
- [Frontend E2E](https://github.com/ihabkhaled/ClawAI/blob/main/testing/frontend-e2e-standard.md)
- [Contract testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/contract-testing-standard.md)
- [RabbitMQ testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/rabbitmq-testing-standard.md)
- [Database testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/database-testing-standard.md)
- [Accessibility testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/accessibility-testing-standard.md)
- [Visual testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/visual-testing-standard.md)
- [Security testing](https://github.com/ihabkhaled/ClawAI/blob/main/testing/security-testing-standard.md)
- [Coverage policy](https://github.com/ihabkhaled/ClawAI/blob/main/testing/coverage-policy.md)
- [Test data & fixtures](https://github.com/ihabkhaled/ClawAI/blob/main/testing/test-data-and-fixtures.md)
- [Flaky test policy](https://github.com/ihabkhaled/ClawAI/blob/main/testing/flaky-test-policy.md)
- [Quality gates](https://github.com/ihabkhaled/ClawAI/blob/main/testing/quality-gates.md)

## Related

- Memory: [`../memory/testing-strategy.md`](https://github.com/ihabkhaled/ClawAI/blob/main/memory/testing-strategy.md),
  [`../memory/known-pitfalls.md`](https://github.com/ihabkhaled/ClawAI/blob/main/memory/known-pitfalls.md)
- SDLC test artifacts: [`../docs/features/_template/12-test-strategy.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/features/_template/12-test-strategy.md),
  [`../docs/features/_template/13-coverage-plan.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/features/_template/13-coverage-plan.md)

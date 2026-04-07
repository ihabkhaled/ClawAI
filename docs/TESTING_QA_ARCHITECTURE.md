# Testing and QA Architecture Audit

## Overview

Claw uses Jest as its test framework across all workspaces. The codebase has 58 test files across 10 of 12 services (2 services have 0 tests). CI runs lint, typecheck, test, and build via GitHub Actions.

---

## Test File Distribution

| Service | Test Files | Focus Areas |
|---|---|---|
| claw-frontend | 23 | Components, hooks, utilities |
| claw-auth-service | 8 | Auth flows, guards, DTOs |
| claw-chat-service | 5 | Message handling, context assembly |
| claw-audit-service | 4 | Event handling, audit logging |
| claw-connector-service | 4 | Connector CRUD, encryption |
| claw-memory-service | 4 | Memory extraction, dedup |
| claw-file-service | 3 | File processing, chunking |
| claw-ollama-service | 3 | Model routing, Ollama integration |
| claw-routing-service | 3 | Routing decisions, policy matching |
| claw-health-service | 1 | Health aggregation |
| claw-client-logs-service | 0 | **NO TESTS** |
| claw-server-logs-service | 0 | **NO TESTS** |
| **Total** | **58** | |

---

## Test Strategy by Layer

### What Is Tested

| Layer | Coverage | Example |
|---|---|---|
| **Managers** (business logic) | Good | `file-processing.manager.spec.ts`, `audit-event.manager.spec.ts` |
| **Services** | Good | `files.service.spec.ts`, `auth.service.spec.ts` |
| **DTOs / Validation** | Partial | Zod schema validation tests |
| **Controllers** | Low | Some controller tests via service mocks |
| **Repositories** | Low | Mocked in most tests, not tested directly |
| **Utilities** | Low | Some utility function tests |
| **Guards / Interceptors** | Low | Auth guard has some coverage |

### What Is NOT Tested

| Layer | Status | Impact |
|---|---|---|
| **E2E (API)** | None | No HTTP-level endpoint testing despite Playwright installed |
| **Integration** | None | No tests with real databases or RabbitMQ |
| **API Contract** | None | No schema validation between services |
| **Load / Performance** | None | No load testing, no latency benchmarks |
| **Frontend E2E** | None | Playwright installed but no test files |
| **RabbitMQ events** | None | Event publishing/consuming not tested end-to-end |
| **Cross-service flows** | None | No tests verifying multi-service workflows |

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
Trigger: push/PR to main, develop
Concurrency: cancel-in-progress per ref

Jobs (4):
  1. lint       — npm run lint
  2. typecheck  — npm run typecheck
  3. test       — npm run test --passWithNoTests (failures tolerated!)
  4. build      — npm run build (depends on lint + typecheck passing)
```

### CI Weaknesses
- **Test failures are tolerated** — `|| true` means broken tests don't block merges
- **No database in CI** — tests run without PostgreSQL/MongoDB/Redis/RabbitMQ
- **No integration test job** — only unit tests run
- **No coverage reporting** — no coverage thresholds, no coverage badges
- **No E2E test job** — Playwright is a dependency but never executed
- **Build depends on lint + typecheck but NOT test** — tests could fail and build still succeeds

---

## Coverage Matrix (Estimated)

| Service | Unit Tests | Integration | E2E | Load | Contract |
|---|---|---|---|---|---|
| auth-service | Moderate | None | None | None | None |
| chat-service | Moderate | None | None | None | None |
| connector-service | Moderate | None | None | None | None |
| routing-service | Low | None | None | None | None |
| memory-service | Moderate | None | None | None | None |
| file-service | Low | None | None | None | None |
| audit-service | Moderate | None | None | None | None |
| ollama-service | Low | None | None | None | None |
| health-service | Minimal | None | None | None | None |
| client-logs-service | **NONE** | None | None | None | None |
| server-logs-service | **NONE** | None | None | None | None |
| frontend | Good | None | None | None | None |

---

## What Is REAL

1. **58 test files across 10 services** — meaningful test coverage exists
2. **Jest framework standardized** — consistent testing approach across all workspaces
3. **Manager/service layer focus** — business logic is the primary test target (correct priority)
4. **CI pipeline runs on every push/PR** — automated quality gate exists
5. **Lint + typecheck block builds** — code quality enforced before build step
6. **Frontend has the most tests (23)** — UI components and hooks tested
7. **Shared packages buildable in CI** — build order correctly managed
8. **Prisma clients generated in CI** — services can compile and test without local databases

## What Is MISSING

1. **No E2E tests** — Playwright is installed but has zero test files
2. **No integration tests** — no tests with real databases or message queues
3. **No API contract tests** — no validation that service-to-service DTOs match
4. **No load/performance tests** — no benchmarks, no latency targets
5. **2 services with 0 tests** — client-logs-service and server-logs-service completely untested
6. **Test failures don't block CI** — `--passWithNoTests` + `|| true` means CI always passes
7. **No coverage thresholds** — no minimum coverage enforced
8. **No mutation testing** — no validation that tests actually catch bugs
9. **No snapshot tests for API responses** — response shapes can drift undetected
10. **No test database seeding** — no fixtures or factories for consistent test data

---

## Signs Testing Is Shallow — Checklist

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Do tests cover error paths, not just happy paths? | PARTIAL | Some error cases tested, many missing |
| 2 | Can tests catch a breaking API change? | NO | No contract tests, no snapshot tests |
| 3 | Do tests run with real dependencies? | NO | All external deps mocked |
| 4 | Do test failures block deployment? | NO | CI tolerates test failures |
| 5 | Is there a coverage threshold? | NO | No minimum coverage enforced |
| 6 | Are all services tested? | NO | 2 services have 0 tests |
| 7 | Do tests verify cross-service workflows? | NO | No integration or E2E tests |
| 8 | Can tests catch a regression in routing logic? | PARTIAL | Routing service has 3 test files |
| 9 | Can tests catch a regression in file processing? | PARTIAL | File processing manager has tests |
| 10 | Do frontend tests cover user workflows? | NO | Component tests exist, no E2E user flows |

### Verdict
Testing is **structurally present but practically insufficient**. Unit tests cover the right layer (business logic) and the framework is solid. But the absence of integration tests, E2E tests, and enforceable coverage thresholds means the test suite provides false confidence — it can verify individual functions work in isolation but cannot verify the system works as a whole.

---

## Recommended Improvements (Priority Order)

1. **Make test failures block CI** — remove `|| true`, add `build` dependency on `test` job
2. **Add tests to client-logs and server-logs services** — eliminate 0-test services
3. **Add coverage thresholds** — enforce minimum (e.g., 60%) per service
4. **Add integration test job** — Docker Compose in CI for database-backed tests
5. **Add E2E tests with Playwright** — cover critical user flows (login, chat, file upload)
6. **Add API contract tests** — validate service-to-service DTO compatibility
7. **Add load tests** — k6 or artillery for latency/throughput benchmarks
8. **Add coverage reporting** — badge in README, PR comments with coverage diff

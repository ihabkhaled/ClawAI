# Release-Ready Quality Gate

## Purpose

This document defines every check that must pass before a ClawAI release is approved. No release ships unless every gate is green. There are no exceptions, no "we'll fix it in the next release," no "it only affects one user." A red gate blocks release until it is resolved and the gate is re-evaluated.

---

## Gate Categories

The quality gate has six categories. Every category must pass independently.

| Category                      | Gates   | Pass Criteria            |
| ----------------------------- | ------- | ------------------------ |
| A. Automated Checks           | 4 gates | All commands exit 0      |
| B. Infrastructure Health      | 3 gates | All services healthy     |
| C. Bug Status                 | 1 gate  | No open S1/S2 bugs       |
| D. Test Coverage              | 5 gates | All test types pass      |
| E. Review and Sign-off        | 3 gates | All approvals obtained   |
| F. Configuration Completeness | 6 gates | All config files updated |

---

## Category A: Automated Checks

These are the four automated quality checks that run in CI and as pre-commit hooks. Each must produce zero errors.

### A1: TypeScript Compilation

```bash
npm run typecheck
```

**Pass criteria:** Zero errors across all workspaces (frontend + 13 backend services + 3 shared packages).

**What this catches:**

- Type mismatches between frontend and backend.
- Missing properties on DTOs and types.
- Incorrect enum usage.
- Broken imports after refactoring.

**Common failures:**

- Frontend type does not match updated backend DTO (forgot to sync `src/types/`).
- Shared package type changed but dependent services not updated.
- New environment variable added but `AppConfig` Zod schema not updated.

### A2: ESLint

```bash
npm run lint
```

**Pass criteria:** Zero errors. Pre-existing warnings are acceptable but must not increase.

**What this catches:**

- `any` type usage.
- Missing explicit return types.
- Inline type/interface/enum/const declarations in logic files.
- Console.log statements.
- Security vulnerabilities (eval, non-literal regex, timing attacks).
- Import ordering violations.
- Unused variables.

**Common failures:**

- Inline `const` in a service file (must extract to constants file).
- Missing `type` keyword on type-only imports.
- `any` crept in from a third-party library type.

### A3: Test Suite

```bash
npm run test
```

**Pass criteria:** All tests pass (312+ tests across 9 services and frontend). Zero failures, zero skipped tests (unless pre-existing and documented).

**What this catches:**

- Broken business logic after refactoring.
- DTO validation regressions.
- Utility function edge cases.
- Component rendering regressions.

**Common failures:**

- Test expects old DTO shape after schema change.
- Mock data does not match updated Prisma model.
- Snapshot test needs updating after UI change.

### A4: Production Build

```bash
npm run build
```

**Pass criteria:** All workspaces build successfully. Zero build errors.

**What this catches:**

- Dead code that TypeScript allows but bundler rejects.
- Missing environment variables referenced at build time (NEXT*PUBLIC*\*).
- Circular dependencies.
- Asset import issues.

**Common failures:**

- Next.js page uses server-only code in a client component.
- Missing `NEXT_PUBLIC_API_URL` in build environment.
- Shared package not built before dependent service.

---

## Category B: Infrastructure Health

### B1: All Docker Containers Healthy

```bash
./scripts/claw.sh ps
```

**Pass criteria:** Every container shows status `(healthy)`. No containers in `(unhealthy)`, `restarting`, or `exited` state.

**Full container list to verify:**

| Container                    | Port         | Health Check            |
| ---------------------------- | ------------ | ----------------------- |
| claw-frontend                | 3000         | HTTP GET /              |
| nginx                        | 4000         | HTTP GET /health        |
| claw-auth-service            | 4001         | HTTP GET /api/v1/health |
| claw-chat-service            | 4002         | HTTP GET /api/v1/health |
| claw-connector-service       | 4003         | HTTP GET /api/v1/health |
| claw-routing-service         | 4004         | HTTP GET /api/v1/health |
| claw-memory-service          | 4005         | HTTP GET /api/v1/health |
| claw-file-service            | 4006         | HTTP GET /api/v1/health |
| claw-audit-service           | 4007         | HTTP GET /api/v1/health |
| claw-ollama-service          | 4008         | HTTP GET /api/v1/health |
| claw-health-service          | 4009         | HTTP GET /api/v1/health |
| claw-client-logs-service     | 4010         | HTTP GET /api/v1/health |
| claw-server-logs-service     | 4011         | HTTP GET /api/v1/health |
| claw-image-service           | 4012         | HTTP GET /api/v1/health |
| claw-file-generation-service | 4013         | HTTP GET /api/v1/health |
| PostgreSQL (9 instances)     | 5432-5440    | pg_isready              |
| MongoDB                      | 27017        | mongosh --eval          |
| Redis                        | 6379         | redis-cli ping          |
| RabbitMQ                     | 5672 / 15672 | rabbitmq-diagnostics    |
| Ollama                       | 11434        | HTTP GET /api/tags      |
| ClamAV                       | 3310         | clamd check             |

### B2: All Nginx Routes Respond

Test each route through the Nginx proxy (port 4000):

```bash
# Auth
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/auth/health

# Each service
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/health
```

**Pass criteria:** Every route returns a valid HTTP response (200, 401 for auth-protected routes, not 502/503/504).

**Common failures:**

- New service added but Nginx config not updated (502 Bad Gateway).
- Upstream service name in Nginx does not match Docker Compose service name.
- SSE route missing `proxy_buffering off` directive.

### B3: Aggregated Health Endpoint

```bash
curl http://localhost:4000/api/v1/health
```

**Pass criteria:** The health service aggregates all service statuses and returns `{ status: "healthy" }`. If any service reports unhealthy, the aggregated response indicates which service(s) are down.

---

## Category C: Bug Status

### C1: No Open S1/S2 Bugs

**Pass criteria:** Zero open bugs with severity S1 (Critical) or S2 (Major).

**Verification:**

- Review the bug tracker for any S1/S2 bugs in Open, In Progress, or Fixed (not yet Verified) status.
- S1/S2 bugs in "Verified" status are acceptable (fix confirmed, awaiting final regression).
- S1/S2 bugs in "Closed" status are acceptable (fully resolved).

**If this gate fails:**

- The release is blocked.
- All S1 bugs are P0 (fix immediately).
- All S2 bugs are triaged for priority -- P1 must be fixed, P2 can be deferred with documented justification and stakeholder approval.

---

## Category D: Test Coverage

### D1: Unit Tests Pass for All New/Changed Functions

**Pass criteria:** Every new or modified function in the changeset has at least one unit test that covers the happy path and at least one error path.

**Verification:**

- Review the diff. For each changed service/module/utility file, confirm a corresponding test file exists and covers the change.
- New files without corresponding test files fail this gate.

### D2: API Tests Pass for All Changed Endpoints

**Pass criteria:** Every new or modified API endpoint has been tested with valid input, invalid input, missing auth, and wrong role.

**Verification method:**

```bash
# Example: test a chat endpoint
# Valid request (200)
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "...", "content": "Hello"}'

# Missing auth (401)
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Content-Type: application/json" \
  -d '{"threadId": "...", "content": "Hello"}'

# Wrong role (403) — use VIEWER token for a write endpoint
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "...", "content": "Hello"}'

# Invalid input (400)
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "", "content": ""}'
```

### D3: UI Tests Pass for All Changed Pages

**Pass criteria:** Every new or modified page/component has been manually tested or has automated tests covering the happy path, empty state, error state, and loading state.

### D4: Integration Tests Pass for All Changed Flows

**Pass criteria:** Every cross-service flow affected by the changeset has been tested end-to-end.

**Key integration flows to verify:**

| Flow              | Services Involved                                         | Verification                                                  |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Send message      | frontend, chat, routing, ollama/connectors, memory, audit | Message appears, routing decision logged, audit entry created |
| Parallel compare  | frontend, chat, routing, multiple providers               | All model responses appear, each has correct provider badge   |
| Create connector  | frontend, connector, audit                                | Connector in DB, health check runs, audit entry exists        |
| Download model    | frontend, ollama                                          | Pull job created, SSE progress works, model appears in list   |
| Upload file       | frontend, file, (clamav)                                  | File in DB, chunks generated, file usable in chat             |
| Login/logout      | frontend, auth, audit                                     | JWT issued, session created, audit entry exists               |
| Memory extraction | chat, memory, ollama                                      | Message completed, memories extracted, duplicates prevented   |

### D5: Regression Tests Pass for Affected Areas

**Pass criteria:** Features adjacent to the changed code are tested to confirm no regressions.

**Regression scope by change area:**

| Changed Area                              | Regression Scope                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Auth service                              | Login, logout, token refresh, RBAC on all pages                         |
| Chat service                              | Send message, thread CRUD, attachments, parallel compare, SSE streaming |
| Connector service                         | Connector CRUD, health check, model sync, routing model availability    |
| Routing service                           | All 7 routing modes, policy application, routing replay                 |
| Ollama service                            | Model management, pull jobs, catalog, role assignment, generation       |
| Memory service                            | Memory CRUD, context packs, memory extraction                           |
| File service                              | Upload, chunking, download, attachment in chat                          |
| Frontend shared (types, hooks, utilities) | All pages that import the changed module                                |
| Shared packages                           | All services that depend on the changed package                         |
| Nginx config                              | All routes through the proxy                                            |
| Docker compose                            | All container startup and health                                        |

---

## Category E: Review and Sign-off

### E1: Code Review Completed

**Pass criteria:** Every file in the changeset has been reviewed by at least one person who did not write the code.

**Review checklist (reviewer must verify):**

- [ ] No `any` types.
- [ ] No `eslint-disable` comments.
- [ ] No inline type/enum/const declarations in logic files.
- [ ] No business logic in controllers.
- [ ] No Prisma calls outside repositories.
- [ ] No `console.log` statements.
- [ ] No secrets in code or comments.
- [ ] DTOs have Zod validation with `.max()` on strings and arrays.
- [ ] New functions have explicit return types.
- [ ] New user-facing text uses `t()` for i18n.
- [ ] Tests exist for new code.

### E2: UAT Sign-off

**Pass criteria:** User Acceptance Testing completed and signed off. The tester confirms the feature works as specified from the user's perspective.

Refer to [Client Acceptance Testing Standard](./11-CLIENT_ACCEPTANCE_TESTING_STANDARD.md) for the UAT process and scorecard.

### E3: Documentation Updated

**Pass criteria:** All documentation reflects the current state of the system.

Files to check:

- [ ] `CLAUDE.md` -- updated if new patterns, services, env vars, or rules added.
- [ ] `docs/` -- updated if architecture, flows, or data models changed.
- [ ] Service-specific docs -- updated if service behavior changed.

---

## Category F: Configuration Completeness

### F1: Environment Variables

**Pass criteria:** If any environment variable was added, removed, or renamed:

- [ ] `.env.example` updated with the variable and a descriptive example value.
- [ ] `.env` updated with a working dev value.
- [ ] `scripts/install.sh` updated in the generated `.env` block.
- [ ] `scripts/install.ps1` updated in the generated `.env` block.

### F2: Docker Compose Files

**Pass criteria:** If any service, port, volume, or database was added or changed:

- [ ] `docker-compose.dev.yml` updated.
- [ ] `docker-compose.yml` (production) updated.
- [ ] `docker-compose.dev.ollama.yml` updated.
- [ ] `docker-compose.prod.ollama.yml` updated.

### F3: Nginx Configuration

**Pass criteria:** If any new routes or services were added:

- [ ] `infra/nginx/nginx.conf` updated with upstream and location block.
- [ ] SSE routes have `proxy_buffering off` and correct headers.

### F4: CI Pipeline

**Pass criteria:** If any new service was added:

- [ ] `.github/workflows/ci.yml` updated with Prisma generate step and test env vars.

### F5: Shared Packages

**Pass criteria:** If cross-service types or constants changed:

- [ ] `packages/shared-types` updated with new event patterns or enums.
- [ ] `packages/shared-constants` updated with new ports or service names.

### F6: i18n Locales

**Pass criteria:** If any new user-facing text was added:

- [ ] All 8 locale files updated: `en.ts`, `ar.ts`, `de.ts`, `es.ts`, `fr.ts`, `it.ts`, `pt.ts`, `ru.ts`.
- [ ] Translation keys added to `src/types/i18n.types.ts`.

---

## Quality Gate Summary Checklist

Use this checklist before approving any release:

```
CATEGORY A: AUTOMATED CHECKS
[ ] A1: npm run typecheck — 0 errors
[ ] A2: npm run lint — 0 errors
[ ] A3: npm run test — all pass (312+ tests)
[ ] A4: npm run build — all workspaces build

CATEGORY B: INFRASTRUCTURE HEALTH
[ ] B1: All Docker containers healthy
[ ] B2: All Nginx routes respond
[ ] B3: Aggregated health endpoint returns healthy

CATEGORY C: BUG STATUS
[ ] C1: No open S1/S2 bugs

CATEGORY D: TEST COVERAGE
[ ] D1: Unit tests for all new/changed functions
[ ] D2: API tests for all changed endpoints
[ ] D3: UI tests for all changed pages
[ ] D4: Integration tests for all changed flows
[ ] D5: Regression tests for affected areas

CATEGORY E: REVIEW AND SIGN-OFF
[ ] E1: Code review completed
[ ] E2: UAT sign-off obtained
[ ] E3: Documentation updated

CATEGORY F: CONFIGURATION COMPLETENESS
[ ] F1: Environment variables (.env.example, .env, install scripts)
[ ] F2: Docker compose files (all 4 variants)
[ ] F3: Nginx configuration
[ ] F4: CI pipeline
[ ] F5: Shared packages
[ ] F6: i18n locales (all 8 languages)

RELEASE DECISION:  [ ] APPROVED  /  [ ] BLOCKED
Blocking reason(s): _______________________________________________
Approved by: _______________________________________________
Date: _______________________________________________
```

---

## Evidence Requirements

Every release must include the following evidence artifacts:

| Evidence             | Format                                            | Retention         |
| -------------------- | ------------------------------------------------- | ----------------- |
| CI pipeline run      | Link to green GitHub Actions run                  | Permanent         |
| Test execution log   | Terminal output or CI log showing all tests pass  | Per release       |
| Docker health status | Output of `docker compose ps`                     | Per release       |
| API test results     | curl commands and responses for changed endpoints | Per release       |
| UI screenshots       | Screenshots of changed pages (light + dark mode)  | Per release       |
| UAT scorecard        | Completed Client Acceptance Testing scorecard     | Per release       |
| Code review approval | PR approval from reviewer                         | Permanent (in PR) |
| Bug status report    | List of all S1/S2 bugs and their status           | Per release       |

---

## Release Blocking Protocol

When a gate fails:

1. **Identify the failing gate.** Document which specific check failed and why.
2. **Assess impact.** Determine if the failure is a false positive (flaky test, transient Docker issue) or a real problem.
3. **Fix the issue.** Apply the fix following the standard development process (no shortcuts, no `--no-verify`).
4. **Re-run the entire gate.** Do not cherry-pick individual checks. Run the full quality gate from Category A through Category F.
5. **Document the resolution.** Note what failed, why, and how it was fixed.

A release is approved only when all gates are green in a single, uninterrupted gate evaluation. Partial passes from multiple runs are not valid.

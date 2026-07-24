# Testing Map

Ground truth: `.ai/manifests/tests.json` (**507 test files** total),
`services.json` (`testRunner`/`testFiles` per service).

## Runners

- **Backend services + shared packages → jest** (ts-jest). Test files are
  `*.spec.ts`, colocated in `__tests__/`.
- **Frontend → vitest** (`vitest run`). 151 test files. `*.test.ts` / `*.spec.ts`.
- **E2E → playwright** (`npm run test:e2e` in the frontend).

## Test-file distribution (from tests.json)

| Workspace                             | Runner | Files  |
| ------------------------------------- | ------ | ------ |
| claw-frontend                         | vitest | 151    |
| claw-workspace-service                | jest   | 66     |
| claw-chat-service                     | jest   | 54     |
| claw-routing-service                  | jest   | 49     |
| claw-auth-service                     | jest   | 22     |
| claw-ollama-service                   | jest   | 17     |
| claw-connector-service                | jest   | 16     |
| claw-llamacpp-service                 | jest   | 16     |
| @claw/shared-utilities                | jest   | 16     |
| claw-file-service                     | jest   | 15     |
| claw-research-service                 | jest   | 14     |
| claw-audit-service                    | jest   | 13     |
| claw-memory-service                   | jest   | 12     |
| claw-agent-service                    | jest   | 9      |
| claw-image-service                    | jest   | 9      |
| claw-file-generation-service          | jest   | 7      |
| claw-server-logs-service              | jest   | 7      |
| claw-client-logs-service              | jest   | 6      |
| claw-health-service                   | jest   | 4      |
| @claw/shared-entitlements             | jest   | 2      |
| @claw/shared-constants / shared-types | jest   | 1 each |
| @claw/shared-auth / shared-rabbitmq   | jest   | 0      |

## Coverage bar

**≥92%** on all four metrics (statements, branches, functions, lines), enforced
via `coverageThreshold` in each `jest.config.ts` / `vitest.config.ts`. Ratcheted,
never lowered — if a change drops a service below its threshold, fix the test gap
before merging.

## Test quality rules (`rules/04-testing-rules.md`)

- No `.toBeDefined()`-only assertions — assert behaviour.
- No `xit` / `xdescribe` / `.skip()` (CI rejects).
- Mock at boundaries only (DB, HTTP, RabbitMQ, ClamAV, Ollama) — never mock the
  unit under test.
- DTO fuzz tests for every Zod schema (valid + boundary + invalid + null/empty/
  overflow).
- Manager error-path tests required (every `catch` covered).
- Test files have all ESLint restrictions OFF; `any` allowed.

## The test layers (beyond unit)

Unit tests are the floor. A feature also needs, per `CLAUDE.md` QE lifecycle and
`skills/05-qa-toolkit.md`:

- A **QA script** `qa/test-<feature>.sh` (gitignored) — auth + every endpoint
  (happy + 400/401/403/404/409) + DTO validation + DB verification via
  `docker exec … psql -tAc` + Docker log check (0 `UnhandledPromiseRejection` /
  `FATAL`). 0 failures required.
- Manual API testing (curl), manual browser UAT (loading/empty/error/success,
  dark mode, Arabic RTL, mobile 375×812), regression, and cross-service flow
  verification.

## Running tests

```bash
# Per touched folder (the gate lane)
cd apps/claw-<service> && npm test           # jest
cd apps/claw-frontend  && npm test           # vitest run
cd apps/claw-frontend  && npm run test:e2e   # playwright

# Coverage
npm run test:cov

# Scope to the diff
npm run affected:test
```

Never run the all-workspace `npm run test` for a scoped change (see
[stack-and-toolchain.md](stack-and-toolchain.md)). Frontend tests may fail on the
host due to rollup native-binary issues on newer Node — run inside Docker if so.

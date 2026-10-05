# QA evidence - Threads generation handoff

Batch: threads-generation-handoff (5b-a)
Commit: pending
Verdict: PARTIAL

| Lane | Role                                   | Status         | Evidence / reason                                                                                                                                                          |
| ---- | -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Focused automated tests                | PASS           | Normal pre-push ran Threads service: 5 files, 17 tests passed; generation service: 12 files, 40 tests passed.                                                              |
| L02  | Lint, typecheck, build                 | PASS           | Both service typechecks/builds pass; changed-file ESLint has no errors.                                                                                                    |
| L03  | Manual API and branch log              | PASS           | Local Threads and generation services plus both PostgreSQL databases are healthy; `nginx -t` passes; HTTPS requests through local Nginx return 401 without authentication. |
| L04  | Browser flow and screenshots           | NOT_APPLICABLE | No frontend files changed in batch 5b-a.                                                                                                                                   |
| L05  | Automated end-to-end                   | NOT_RUN        | No authenticated generation fixture currently drives both services.                                                                                                        |
| L06  | RBAC and plan matrix                   | NOT_RUN        | Unit tests prove owner ID is applied to the job lookup; live roles and plan tiers, including Free, remain untested.                                                        |
| L07  | Responsive/device matrix               | NOT_APPLICABLE | No UI changed.                                                                                                                                                             |
| L08  | User acceptance                        | NOT_RUN        | No owner UI exists yet.                                                                                                                                                    |
| L09  | Product verification                   | PASS           | DTO tests enforce explicit intent version and selected cap; owner polling stores generated Markdown as a private PENDING revision.                                         |
| L10  | Business/credit verification           | NOT_RUN        | Generation tests confirm snapshot → existing Auth cap reservation → persistence/dispatch ordering; live Auth ledger settlement remains untested.                           |
| L11  | Regression                             | PASS           | Focused changed-service tests pass; wider regression is not claimed.                                                                                                       |
| L12  | Security                               | NOT_RUN        | Owner-scoped repository query and service check are unit-tested; live IDOR and role/rate-limit probes remain.                                                              |
| L13  | Performance/accessibility              | NOT_RUN        | No measured queue load; no UI changed.                                                                                                                                     |
| L14  | i18n/RTL                               | NOT_APPLICABLE | No user-facing UI strings changed.                                                                                                                                         |
| L15  | Docs, knowledge, hooks, GitHub, deploy | NOT_RUN        | Knowledge checks and normal hooks passed and push succeeded; the required GitHub CI and production rollout are still pending.                                              |

## Commands and observed output

- `apps/claw-threads-service`: four focused Vitest files, 15 tests passed.
- `apps/claw-threads-service`: `npm run typecheck`, exit 0.
- `apps/claw-thread-generation-service`: three focused Vitest files, 16 tests passed.
- `apps/claw-thread-generation-service`: `npm run typecheck`, exit 0; Prisma client generated.
- Focused `npx eslint` commands for changed TypeScript paths: exit 0, no errors; existing warning-level findings remain in touched files.
- `node --test tools/__tests__/esm-namespace-import-bindings.test.mjs`: 2 tests passed. On Windows, the guard now recognizes the Application Control block by its message because its error code varies by host policy.
- Local Docker health: `threads-service`, `thread-generation-service`, `pg-threads`, and `pg-thread-generation` are healthy; both databases accept connections. `nginx -t` exits 0.
- Through local Nginx: `POST https://127.0.0.1/api/v1/thread-publications/generations` and `GET https://127.0.0.1/api/v1/thread-publications/test-id/generation-state` each return HTTP 401 without credentials. `curl.exe --insecure` used the local development TLS certificate.

No browser, screenshot, live authenticated API, credit-ledger, load, or full
role/plan result is claimed. Update this report with exact final gate output
after the batch is normally committed and pushed.

# QA evidence - threads-owner-edit-revalidation

Batch: threads-owner-edit-revalidation
Date: 2026-10-05
Commits: This report ships with the feature commit; Git history records its commit ID.
Verdict: PARTIAL

| Lane | What                                    | Status         | Evidence or reason                                                                                                                                                                                                                                                                        |
| ---- | --------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Changed unit/integration tests          | PASS           | Generation: 4 Vitest files, 31 passed. Threads: 4 Vitest files, 25 passed.                                                                                                                                                                                                                |
| L02  | Typecheck, lint, build                  | PASS           | Both workspaces typecheck/build exited 0. Changed-file ESLint: 0 errors (generation 24 existing/style warnings); Prettier check passed after formatting.                                                                                                                                  |
| L03  | Manual API through curl with branch log | PASS           | `curl.exe ... POST /api/v1/thread-publications/qa-missing/revisions` with no auth returned HTTP 401 `Missing authorization header`; public missing-slug GET returned HTTP 404. Nginx route verified; migration applied with `docker exec claw-threads-service npx prisma migrate deploy`. |
| L04  | Real browser with screenshots           | NOT_APPLICABLE | Backend-only batch; owner UI is not included.                                                                                                                                                                                                                                             |
| L05  | Automation e2e                          | NOT_RUN        | No authenticated integrated generation/edit fixture was available; unit tests cover service/repository/client branches.                                                                                                                                                                   |
| L06  | RBAC across roles and plan tiers        | NOT_RUN        | Only unauthenticated denial was probed live; paid/free/admin matrix requires integrated fixtures.                                                                                                                                                                                         |
| L07  | Device matrix                           | NOT_APPLICABLE | No frontend, viewport, orientation, or RTL UI changes.                                                                                                                                                                                                                                    |
| L08  | UAT                                     | NOT_RUN        | Full owner journey needs the not-yet-built publication UI and real generation.                                                                                                                                                                                                            |
| L09  | Product verification                    | PASS           | Tests cover immutable exact-content review, owner scoping, cap/idempotency input, hash mismatch, review thresholds, and explicit approval path. Existing approved version stays public until replacement approval.                                                                        |
| L10  | Business verification                   | PASS           | Fresh selected cap required; no PAYG added; existing entitlement flow reused; Judge 80/Critic 75 and unanimous author review retained. No live paid calls made.                                                                                                                           |
| L11  | Regression                              | PASS           | Changed-workspace focused suites: 56 tests passed across both services.                                                                                                                                                                                                                   |
| L12  | Security                                | NOT_RUN        | Live missing-auth request returned 401, but that alone does not complete the security lane. No authenticated cross-owner IDOR fixture is available; scoped IDOR and response safety checks are in unit tests.                                                                             |
| L13  | Performance and accessibility           | NOT_RUN        | No UI changed and no load profile captured.                                                                                                                                                                                                                                               |
| L14  | i18n                                    | NOT_APPLICABLE | No user-facing text or locale files changed.                                                                                                                                                                                                                                              |
| L15  | Docs, knowledge and GitHub gates        | NOT_RUN        | Same-batch docs are written; generated artifacts, normal hooks, push, CI, release and deployment remain.                                                                                                                                                                                  |

## Findings

The first local migration status check showed the additive migration pending;
`prisma migrate deploy` applied it successfully. Nginx passed `nginx -t`. Both
Threads databases and service containers are healthy. One initial scoped lint
run found duplicate type imports and a nested ternary in the lifecycle service;
these were fixed. No paid provider call was run.

## Open gaps

- L05, L06, L08, L12: close with integrated authenticated owner/RBAC fixtures.
- L13: close with a measured service load pass; accessibility follows the UI batch.
- L15: close after generated checks, normal commit/push, CI and deployment read.

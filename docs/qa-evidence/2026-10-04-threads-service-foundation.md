# QA evidence - threads-service-foundation

Batch: threads-service-foundation
Date: 2026-10-04
Commits: pending push
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | Six feature Vitest specs: 10 tests passed; two matching specs for comment-only existing TS files: 32 tests passed; focused Nginx Node test: 1 passed. No full-suite tests ran.                                                                       |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | Changed-file ESLint on touched TS files exited 0; typecheck and build exited 0 for both Threads workspaces, health-service, and shared-constants. ESLint on the touched release script reports two pre-existing no-undef process errors at line 194. |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | Invoke-WebRequest to both built /api/v1/health routes returned HTTP 200 and each service name; Pino logged GET /api/v1/health with serviceName for both.                                                                                             |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | This foundation batch has no frontend route or user interface to open in a browser.                                                                                                                                                                  |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No publication or generation user flow exists in the health-only foundation.                                                                                                                                                                         |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No business endpoint exists yet; only public health checks are exposed.                                                                                                                                                                              |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No frontend surface exists in this batch.                                                                                                                                                                                                            |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | There is no user workflow to walk until the publication and generation batches.                                                                                                                                                                      |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_APPLICABLE | This batch adds deployable service foundations only; runtime product behavior is scheduled later.                                                                                                                                                    |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No billing, spend cap, or user-facing product copy is implemented in this batch.                                                                                                                                                                     |
| L11  | Regression (neighbouring features still work)                           | PASS           | node --test tools/**tests**/threads-nginx-routing.test.mjs: 1 passed; asserts publication route separation and legacy /api/v1/threads rewrite.                                                                                                       |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Both AppModules apply AuthGuard, RolesGuard, and SessionRevocationGuard; health controllers alone use Public; Pino redacts authorization, password, token, secret, and email.                                                                        |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No user-facing interface or feature workload is included in this health-only foundation.                                                                                                                                                             |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No localized user-facing strings were added in this batch.                                                                                                                                                                                           |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Knowledge verify, inventory audit, QA evidence, trace, and changed-content secret guard passed; remote CI/deployment is pending. The strict Akinator whole-repository scan found 5,459 baseline findings outside this batch.                         |

## Findings

One Nginx assertion initially failed because its regex treated $origin_threads as an end anchor. Escaping the dollar sign fixed the assertion; the focused test then passed.
The Akinator strict repository scan exited 1 with 5,459 baseline findings, including hook-policy, stale-link, and context-map findings. The first push hook also found missing service guides and Docker shared-package build commands; focused knowledge-coverage (4 tests) and Dockerfile-completeness (1 test) now pass after those fixes. No unrelated repository-wide cleanup was included.

## Open gaps

L15 GitHub CI and release/deployment result; retry push after the focused hook fixes, then close before Batch 2.

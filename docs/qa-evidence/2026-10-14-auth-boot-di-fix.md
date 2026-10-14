# QA evidence - auth-boot-di-fix

Batch: auth-boot-di-fix
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | new spec entitlements.module-providers.spec.ts asserts the module that provides ThreadJobBudgetService also provides ThreadJobBudgetFreeMeterRepository (1/1); eslint and typecheck clean            |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | run-ts7 --noEmit and eslint --max-warnings 0 clean in apps/claw-auth-service                                                                                                                         |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | local stack rebuilt and restarted on the full wave: auth, chat, workspace, threads, thread-generation and plugin services all reached healthy; no Nest dependency-resolution errors in the boot logs |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L11  | Regression (neighbouring features still work)                           | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no authorisation change                                                                                                                                                                              |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | one-line provider registration; no UI or behaviour change beyond booting                                                                                                                             |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | production redeploy result is read after the release runs                                                                                                                                            |

## Findings

- Production auth-service crash-looped after the release: Nest could not resolve ThreadJobBudgetFreeMeterRepository for ThreadJobBudgetService (provided in the credit module only). Unit tests never build the module, so CI and the integration run missed it; the local boot check found nothing wrong only after the provider was registered.

## Open gaps

- L15: production health after redeploy.

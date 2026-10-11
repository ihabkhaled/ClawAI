# QA evidence - notifications-portal

Batch: notifications-portal
Date: 2026-10-08
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | claw-frontend vitest: 39 files, 701 tests pass across layout, notifications, settings, hooks, i18n and the new utility (bell badge, 99+, lazy list, mark read and navigate, mark all, empty and error states, preference save and rollback, 13-locale key resolution). |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN        | `npm run typecheck` 0 errors; eslint 0 errors on the new files. Production build not run.                                                                                                                                                                              |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | The API behind it was exercised live in the backend record (2026-10-08-threads-notifications-backend.md).                                                                                                                                                              |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | The browser tool was unavailable and the dev frontend was stuck on a slow Tailwind compile after its rebuild, so the bell was not seen on screen.                                                                                                                      |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No committed Playwright spec.                                                                                                                                                                                                                                          |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | Not walked as any role in a browser.                                                                                                                                                                                                                                   |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | Device matrix and RTL not captured.                                                                                                                                                                                                                                    |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Not walked in a browser.                                                                                                                                                                                                                                               |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Owner asked for in-app notices when a Thread is ready, published or failed; the bell and settings deliver that. Push is a separate open item.                                                                                                                          |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money or limit shown.                                                                                                                                                                                                                                               |
| L11  | Regression (neighbouring features still work)                           | PASS           | Six layout suites that render the top bar needed the bell mocked (it uses react-query); all 14 layout files pass.                                                                                                                                                      |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Text is rendered as text; links are navigated through the localised router; the API is scoped by the session.                                                                                                                                                          |
| L13  | Performance and accessibility                                           | NOT_RUN        | No Lighthouse or screen-reader pass.                                                                                                                                                                                                                                   |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | 23 strings in 13 locales, real translations; a test resolves every key in every locale file and checks the {count} placeholder.                                                                                                                                        |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Change note added; GitHub gates not yet read.                                                                                                                                                                                                                          |

## Findings

1. The top bar now needs a QueryClient; six layout tests had to mock the bell.
2. Dev frontend rebuild left Turbopack's postcss step timing out (Tailwind scan over the bind mount); not investigated further.

## Open gaps

L02, L04 to L08 (browser, roles, devices, RTL), L13, L15. Needs a working browser tool and dev frontend.

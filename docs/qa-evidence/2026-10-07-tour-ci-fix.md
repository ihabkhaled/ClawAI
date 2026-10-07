# QA evidence - tour-ci-fix

Batch: tour-ci-fix
Date: 2026-10-07
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                              |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `npm test -- src/components/layout src/utilities/__tests__/tour- src/constants/__tests__/tours-content` in claw-frontend: 18 files, 65 tests pass. The three CI-red layout suites (portal-shell, topbar, locale-switcher) pass. |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN        | `npm run typecheck` 0 errors; eslint and prettier clean on the 3 files. Production build not run.                                                                                                                               |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | Front-end hooks only; no API changed.                                                                                                                                                                                           |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | Browser walk of the tours was done in the parent batch (2026-10-07-product-tours.md); not repeated for a null-guard.                                                                                                            |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No committed Playwright spec.                                                                                                                                                                                                   |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No permission or plan logic touched.                                                                                                                                                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No layout change.                                                                                                                                                                                                               |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Covered by the parent batch's UAT; this only adds fallbacks.                                                                                                                                                                    |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_APPLICABLE | No product behavior change: English copy and `/` are used only when a locale or path is missing.                                                                                                                                |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or claim.                                                                                                                                                                                                       |
| L11  | Regression (neighbouring features still work)                           | PASS           | GitHub CI on 10e74932 had 3 red frontend shards (TypeError reading 'ui' / 'split' of null from the tour hooks under mocked locale and path). After the fix the same suites pass locally; CI on the fix commit: CI success.      |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | No input, auth or secret handling touched.                                                                                                                                                                                      |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No render-path change.                                                                                                                                                                                                          |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No copy changed; the fallback reads the existing English tour copy.                                                                                                                                                             |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Fix of the parent batch; its knowledge delta is in ADR-163 and the parent record.                                                                                                                                               |

## Findings

(bugs found while testing, what was fixed, what is still open and why)

## Open gaps

(every NOT_RUN or FAIL lane again, with who closes it and when)

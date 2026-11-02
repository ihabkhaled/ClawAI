# QA evidence - order-the-thread-translation-import-afte

Batch: order-the-thread-translation-import-afte
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: DONE

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | frontend `npx vitest run src/lib/i18n`: 42 files / 1,462 tests, including the 13-locale dictionary completeness tests.                                                                                            |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `eslint --fix` on the 13 locale files leaves them clean; `tsc --noEmit` on claw-frontend clean; the CI lint ratchet reported exactly these 13 import-order errors and nothing else.                               |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | Import order only: no endpoint or runtime behaviour changed.                                                                                                                                                      |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Import order only: no rendered output changed.                                                                                                                                                                    |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No behaviour changed; the existing specs were not touched.                                                                                                                                                        |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No access rule changed.                                                                                                                                                                                           |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No layout change.                                                                                                                                                                                                 |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | No acceptance criteria: a lint ordering fix.                                                                                                                                                                      |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_APPLICABLE | No product behaviour changed.                                                                                                                                                                                     |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or claim changed.                                                                                                                                                                                 |
| L11  | Regression (neighbouring features still work)                           | PASS           | The i18n suites pass unchanged (see L01); the diff is the position of one import line in each locale file.                                                                                                        |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | No input, route or secret touched.                                                                                                                                                                                |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime change.                                                                                                                                                                                                |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | All 13 locale files still import the same dictionary (see L01).                                                                                                                                                   |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | GitHub run 41448634070 (CI, Static frontend lint) listed these 13 errors and no others; knowledge delta: none, because only the position of an import line changed and the translations are described in ADR-217. |

## Findings

The CI lint ratchet failed on 13 import-order errors: another change added `thread-time-translations` ahead of `thread-translation-translations` in each locale file after the rebase. Fixed by ordering the import.

## Open gaps

None.

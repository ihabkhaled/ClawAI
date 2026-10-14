# QA evidence - board-citation-lists-page-cap

Batch: board-citation-lists-page-cap
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                  |
| ---- | ----------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | vitest (swc-free config) src/modules/board + board-index: 14 files, 102 tests passed                |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | threads-service typecheck (run-ts7) exit 0; eslint --max-warnings 0 on touched files exit 0         |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L13  | Performance and accessibility                                           | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN | not run in this change: unit-level fix, live Board API/browser re-test belongs to the next QA round |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS    | apps/claw-threads-service/CLAUDE.md updated; GitHub gates not read, nothing pushed                  |

## Findings

(bugs found while testing, what was fixed, what is still open and why)

## Open gaps

(every NOT_RUN or FAIL lane again, with who closes it and when)

# QA evidence - thread-gen-spend-sync-nonretryable

Batch: thread-gen-spend-sync-nonretryable
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) services+repositories: 14 files, 156 tests passed; new closer spec, client summary, syncSpend, 5 PAYG codes fail on attempt 1 |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 clean on touched files; run-ts7 --noEmit clean                                                                                 |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | backend only, no UI or strings                                                                                                                         |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN        | spend now mirrors the budget row; ledger agreement not re-measured live                                                                                |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no new authz surface; reuses the service-token summary endpoint                                                                                        |
| L13  | Performance and accessibility                                           | NOT_RUN        | not run in this change; live re-verification belongs to the round-3 QA owner                                                                           |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | backend only, no UI or strings                                                                                                                         |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | service CLAUDE.md and service-guide-thread-generation.md updated                                                                                       |

## Findings

(bugs found while testing, what was fixed, what is still open and why)

## Open gaps

(every NOT_RUN or FAIL lane again, with who closes it and when)

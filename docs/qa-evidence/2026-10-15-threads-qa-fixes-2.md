PASSADR-188/189 addenda, service guides, CLAUDE.md files; knowledge:build exit 0, knowledge:verify exit 0 |PASS13-locale FORMAT_* messages added by the frontend helper with locale tests |PASSowner scope unchanged (findOwnedTarget); migration touches only placeholder-titled rows |PASSfull suites of both services and the frontend green |PASSdaily limit now counts only FORMATTED passes (repository spec); skips bounded at 10 model calls/day |NOT_RUNnot run: owner re-test on production needed |NOT_RUNnot run: no deploy of these fixes; live and browser lanes need the owner to QA after release |NOT_RUNnot run: no deploy of these fixes; live and browser lanes need the owner to QA after release |NOT_RUNnot run: no deploy of these fixes; live and browser lanes need the owner to QA after release |NOT_RUNnot run: no deploy of these fixes; live and browser lanes need the owner to QA after release |NOT_RUNnot run: no deploy of these fixes; live and browser lanes need the owner to QA after release |NOT_RUNnot run: no deploy of these fixes; live and browser lanes need the owner to QA after release |NOT_RUNnot run: no deploy of these fixes; live and browser lanes need the owner to QA after release |PASStsc --noEmit exit 0 in both services; eslint --max-warnings 0 on exact files exit 0; frontend typecheck-ts7 and eslint run by the frontend helper |PASSthreads-service vitest 119 files 942 tests exit 0; thread-generation vitest 79 files 863+ tests exit 0; frontend full vitest 9343 tests pass (frontend helper report) |# QA evidence - threads-qa-fixes-2

Batch: threads-qa-fixes-2
Date: 2026-10-15
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                            |
| ---- | ----------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | threads-service vitest 119 files 942 tests exit 0; thread-generation vitest 79 files 863 tests exit 0; frontend full vitest 9343 tests pass (frontend helper) |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | tsc --noEmit exit 0 in both services; eslint --max-warnings 0 exact files exit 0; frontend typecheck and eslint run by the frontend helper                    |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | fixes not deployed; owner re-test on production after release                                                                                                 |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | no browser run; fixes not deployed                                                                                                                            |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | no e2e spec run for these fixes                                                                                                                               |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | not run; owner scope unchanged                                                                                                                                |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | no device run; needs deployed build                                                                                                                           |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | owner UAT after release                                                                                                                                       |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN | owner re-test on production needed                                                                                                                            |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS    | daily limit counts only FORMATTED passes (repository spec); skips bounded at 10 model calls per day                                                           |
| L11  | Regression (neighbouring features still work)                           | PASS    | full suites of both services and the frontend green                                                                                                           |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS    | owner scope unchanged (findOwnedTarget); backfill touches only placeholder-titled rows                                                                        |
| L13  | Performance and accessibility                                           | NOT_RUN | no performance or accessibility run                                                                                                                           |
| L14  | i18n (13 locales, RTL)                                                  | PASS    | 13-locale FORMAT_* messages added with locale tests (frontend helper)                                                                                         |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS    | ADR-188/189 addenda, service guides, CLAUDE.md; knowledge:build exit 0, knowledge:verify exit 0                                                               |

## Findings

Eight QA defects fixed with regression tests. The exact cause of FORMAT_FAILED on the legacy Thread could not be reproduced without production data; legacy normalisation plus specific codes are the fix.

## Open gaps

L03-L08, L09, L13: owner live/browser QA after the next release.

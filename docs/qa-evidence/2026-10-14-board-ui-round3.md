# QA evidence - board-ui-round3

Batch: board-ui-round3
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) src/components/threads/board + src/hooks/threads/board: 7 files, 76 tests passed incl. new reader dir/lang, clamp, maxLength, empty-page count, h2 tests |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 on touched files clean; run-ts7 --noEmit exit 0; no build run                                                                                             |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | frontend-only change, no API touched                                                                                                                                              |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | no live browser run this round; dev container not restarted                                                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | e2e spec edited (Filters regex, locale cookie plus explicit skip) but not executed                                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | no permission change                                                                                                                                                              |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | 768 px container-query layout not re-measured in a browser                                                                                                                        |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | not walked live                                                                                                                                                                   |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | not walked live                                                                                                                                                                   |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money, limits or claims                                                                                                                                                        |
| L11  | Regression (neighbouring features still work)                           | PASS           | all existing board specs still pass (76)                                                                                                                                          |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no authz or input-to-server change beyond clamping                                                                                                                                |
| L13  | Performance and accessibility                                           | NOT_RUN        | heading-order fixed on cards only; reader h4 lives in ThreadReaderBody (out of scope); axe not re-run                                                                             |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN        | no new strings; Arabic reader dir covered by unit test only                                                                                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-frontend/CLAUDE.md Board section updated; GitHub gates not read (not pushed)                                                                                            |

## Findings

Fixed NEW-1, NEW-2, NEW-3, empty-page count, card heading order, e2e selector and locale. Open: empty Post comment feedback (thread-public-community.tsx, shared with the public page) and reader h4 heading order (ThreadReaderBody).

## Open gaps

L04, L05, L07, L08, L09, L13, L14: live browser re-run by the QA agent after deploy.

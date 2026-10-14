# QA evidence - board-ui-round2-fixes

Batch: board-ui-round2-fixes
Date: 2026-10-13
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                              |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) over src/components/threads, hooks/threads/board, lib/i18n, utilities thread-board*: 56 files, 1193 tests passed; new: fuzzy highlight, locale-prefixed list url, q=%00, 429 wait state, all-13-locale no-brace render |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | frontend eslint --max-warnings 0 on all touched files clean; run-ts7 --noEmit exit 0; build NOT_RUN (hook gates it)                                                                                                                             |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | frontend-only change, no API behaviour changed                                                                                                                                                                                                  |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | no live browser pass by this agent; the round-2 Playwright report is the baseline, re-run needed after deploy                                                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | tests/e2e/threads-board.spec.ts not run here (owned by another agent)                                                                                                                                                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | no permission change                                                                                                                                                                                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | share row and 100-char cap layout not re-measured at 320/375 widths                                                                                                                                                                             |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | acceptance walk needs the deployed stack                                                                                                                                                                                                        |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | each D-B01..D-B08 and reader item mapped to a code change and a test (see ADR-178 addendum); empty-comment feedback and owner-page URL wrap are outside this scope                                                                              |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money or limits                                                                                                                                                                                                                              |
| L11  | Regression (neighbouring features still work)                           | PASS           | existing board component, hook and utility tests updated and passing (same run as L01)                                                                                                                                                          |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no authz change; control characters are stripped from q client-side                                                                                                                                                                             |
| L13  | Performance and accessibility                                           | NOT_RUN        | axe not re-run; nested main removed by code inspection and test                                                                                                                                                                                 |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | 3 new keys in 13 locales; thread-board-translations test (45 keys, placeholders) and no-raw-placeholders test across all 13 locales passed; native-speaker review NOT_RUN                                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | ADR-178 addendum, apps/claw-frontend/CLAUDE.md updated; GitHub gates not read (nothing pushed by this agent)                                                                                                                                    |

## Findings

Fixed D-B01 to D-B08 and the reader items (share row, nested main). Open: empty Post comment feedback (shared thread-public-community.tsx) and owner ready-page URL wrap.

## Open gaps

L04, L05, L07, L08, L13: live browser re-run after deploy, owner: QA lane.

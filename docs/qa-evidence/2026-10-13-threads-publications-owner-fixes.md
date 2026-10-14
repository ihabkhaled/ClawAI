# QA evidence - threads-publications-owner-fixes

Batch: threads-publications-owner-fixes
Date: 2026-10-13
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) src/modules/publications: 45 files, 400 tests passed, incl. 2 new specs                                                                    |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 clean on touched files; after prisma generate the threads-service typecheck is clean (integration run: lint, typecheck and 551 tests green) |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | Free-edit decision documented in ADR-176 addendum; owner confirmation pending                                                                                       |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no new endpoint or authz change; unpublish still 404 for non-owners (unit tested)                                                                                   |
| L13  | Performance and accessibility                                           | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN        | unit-level fix only in this slice; live lanes belong to the round-3 run after deploy                                                                                |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-threads-service/CLAUDE.md and ADR-176 addendum updated                                                                                                    |

## Findings

Fixed N-01, N-03, N-04, N-05, D-L2-05 (backend), D-L2-07. D-L2-06 open: no price/hold read endpoint.

## Open gaps

L02 typecheck needs a clean prisma generate; live lanes after deploy.

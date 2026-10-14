| L15 | undefined | PASS | ADR-177 addendum, service guide and workspace CLAUDE.md updated || L14 | undefined | NOT_RUN | Live 13-locale search not run || L13 | undefined | NOT_RUN | Stale scan cost at 20k rows not measured here (D-P8 perf lane) || L12 | undefined | PASS | Raw SQL uses Prisma.sql parameters only; no user text interpolated || L11 | undefined | PASS | Existing board-index and views specs updated and green; normaliser expectations for CJK and Thai changed on purpose || L10 | undefined | NOT_APPLICABLE | No money, limits or copy touched || L09 | undefined | NOT_RUN | Needs live verification of B-01/B-04 || L08 | undefined | NOT_RUN | Needs live CJK search after the migration and reindex || L07 | undefined | NOT_APPLICABLE | Backend-only change, no UI surface touched in this scope || L06 | undefined | NOT_APPLICABLE | No authorization or plan-tier behaviour touched || L05 | undefined | NOT_RUN | Live lane owned by the QA round || L04 | undefined | NOT_APPLICABLE | Backend-only change || L03 | undefined | NOT_RUN | No live stack or migration applied in this scoped task; the live lane re-runs QB-03/QB-04/X-18 after deploy || L02 | undefined | PASS | eslint --max-warnings 0 clean on src/modules/board-index and publication-views files; tsc has no errors in my files (remaining errors are in board/, another owner) || L01 | undefined | PASS | vitest (swc-free config) src/modules/board-index + publication-views.service.spec: 7 files, 55 tests passed |# QA evidence - board-index-cjk-markers-views

Batch: board-index-cjk-markers-views
Date: 2026-10-13
Commits: not committed (staged by the orchestrator)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                              |
| ---- | ----------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) src/modules/board-index + publication-views.service.spec: 7 files, 55 tests passed                                                     |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 clean on src/modules/board-index and the views files; tsc shows no error in these files (remaining errors are in board/, another owner) |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | No live stack or migration applied in this scoped task; the live lane re-runs QB-03, QB-04 and X-18 after deploy                                                |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Backend-only change                                                                                                                                             |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | Live lane is owned by the QA round                                                                                                                              |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No authorization or plan-tier behaviour touched                                                                                                                 |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | Backend-only change, no UI surface touched in this scope                                                                                                        |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Needs live CJK search after the migration and reindex                                                                                                           |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | Needs live verification of B-01 and B-04                                                                                                                        |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limits or copy touched                                                                                                                                |
| L11  | Regression (neighbouring features still work)                           | PASS           | Existing board-index and views specs updated and green; CJK and Thai normaliser expectations changed on purpose                                                 |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Raw SQL uses Prisma.sql parameters only; no user text is interpolated                                                                                           |
| L13  | Performance and accessibility                                           | NOT_RUN        | Stale scan cost at 20k rows not measured here (D-P8 perf lane)                                                                                                  |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN        | Live 13-locale search not run                                                                                                                                   |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | ADR-177 addendum, service guide and workspace CLAUDE.md updated                                                                                                 |

## Findings

B-01, B-04, B-03, D-P8 and the backend half of D-B07 fixed in code; live confirmation pending.

## Open gaps

L03, L05, L08, L09, L13, L14 need the live lane after migration 20261014120000 is applied.

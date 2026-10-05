# QA evidence - admin-usage-analytics-frontend

Batch: admin-usage-analytics-frontend
Date: 2026-10-05
Commits: (this commit); backend batch e22316294
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                  | Status  | Evidence or reason                                                                                                                                                                                        |
| ---- | --------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                   | PASS    | `npx vitest run` in apps/claw-frontend: 699 files, 5426 tests passed. New: utility, repository, component, section/filter, translation-completeness tests (13 locales, placeholders kept, tool labels).   |
| L02  | Typecheck, lint and build (touched workspaces)                        | PASS    | `npm run typecheck` clean; `npx eslint` on touched dirs: 0 errors (1 pre-existing hook warning in use-parallel-compare-page.ts, untouched); `npm run build` (next build) completed and listed all routes. |
| L03  | Manual API test (curl) with the log line proving the branch ran       | NOT_RUN | No live stack in this worktree; the two endpoints were never called over HTTP.                                                                                                                            |
| L04  | Manual browser test (Playwright against the real UI) with screenshots | NOT_RUN | No running frontend or backend with the new code. Needs docker restart claw-frontend plus an auth-service rebuild and the migration, then a walk of /en/observability and the user modal.                 |
| L05  | Automation e2e (a committed or existing spec was run)                 | NOT_RUN | No e2e spec for these views.                                                                                                                                                                              |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                  | NOT_RUN | Unit test proves the section renders nothing without ADMIN_USAGE_VIEW and the backend metadata is admin-only. Not walked with real accounts of each role and plan tier.                                   |
| L07  | Device matrix (3+ widths, both orientations, RTL)                     | NOT_RUN | No screenshots taken. Layout is built for it (wrapping toggle group, overflow-x tables, logical start/end classes) but unverified visually.                                                               |
| L08  | UAT                                                                   | NOT_RUN | Not walked as an operator.                                                                                                                                                                                |
| L09  | Product verification                                                  | NOT_RUN | Not checked against live data. Known gap: in-answer tool calls and image generation are not named per tool (count and workflow only).                                                                     |
| L10  | Business verification (money, limits, copy and claims match the code) | NOT_RUN | Cost renders the server micro-USD string through formatMicroUsd (BigInt, unit-tested); free allowance null/0/limit states are component-tested. Not reconciled with a live ledger.                        |
| L11  | Regression (neighbouring features still work)                         | PASS    | Existing user-usage-dialog and observability tests still pass inside the full 5426-test run.                                                                                                              |
| L12  | Security (authz and IDOR, secrets, injection)                         | NOT_RUN | Admin-only endpoints, user id encoded in the path (tested), emails masked server-side. No live pentest.                                                                                                   |
| L13  | Performance and accessibility                                         | NOT_RUN | No Lighthouse or axe run. Built with labels, aria-pressed, role=alert, a table fallback for the chart.                                                                                                    |
| L14  | i18n (13 locales, RTL)                                                | PASS    | usage-analytics-translations.test.ts: 13 locales present, same keys, same placeholders, fewer than 8 identical-to-English strings per locale. RTL rendering not viewed.                                   |
| L15  | Docs, knowledge delta and GitHub gates read                           | NOT_RUN | Docs and skill added; knowledge:build and audit run in this commit; GitHub gates not read because nothing is pushed.                                                                                      |

## Findings

- None from code review beyond the lint fixes. Browser lanes are the main unproven area.

## Open gaps

- L03, L04, L05, L06 live, L07, L08, L09, L10, L12, L13, L15 GitHub gates: not run; need the stack running with the new auth-service and frontend.

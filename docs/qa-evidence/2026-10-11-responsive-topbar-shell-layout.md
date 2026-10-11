# QA evidence - responsive-topbar-shell-layout

Batch: responsive-topbar-shell-layout
Date: 2026-10-11
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason |
| ---- | ----------------------------------------------------------------------- | ------- | ------------------ |
| L01  | Unit and integration tests (only the changed files)                     | NOT_RUN | PASS               | npx vitest run src/components/layout: 14 files, 38 tests passed; dashboard, admin/connectors, workspace suites passed earlier (26 files, 103 tests)                                                                                                                     |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN | PASS               | npm run typecheck clean; eslint clean on exact changed layout files; prettier on exact files                                                                                                                                                                            |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | NOT_APPLICABLE     | frontend-only layout change, no API touched                                                                                                                                                                                                                             |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | PASS               | scripts/responsive-audit/audit.cjs against the local production build with /api/v1 forwarded to the dev stack: 520 route x viewport cells, 0 failing (before: 48 failing). The relative-shell fix was added after that run and is covered by a class-contract test only |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | NOT_RUN            | no committed e2e spec covers the shell; the audit script is the browser lane                                                                                                                                                                                            |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | NOT_RUN            | audit ran as admin and one paid account; the free tier was not walked                                                                                                                                                                                                   |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | PASS               | 9 widths 320 to 1920 in English, plus Arabic RTL at 320, 390, 768, 1280; 0 failing                                                                                                                                                                                      |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | NOT_RUN            | owner has not walked the observability page after the shell fix                                                                                                                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN | NOT_RUN            | observability blank band not re-checked in a browser after the relative fix                                                                                                                                                                                             |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN | NOT_APPLICABLE     | no money, limit or copy change                                                                                                                                                                                                                                          |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN | PASS               | layout, dashboard, workspace and connector suites pass                                                                                                                                                                                                                  |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | NOT_APPLICABLE     | no auth, secret or data path changed                                                                                                                                                                                                                                    |
| L13  | Performance and accessibility                                           | NOT_RUN | NOT_RUN            | no Lighthouse run; audit checks tap targets as a warning, none found                                                                                                                                                                                                    |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN | NOT_RUN            | no new strings; the More button reuses the existing nav.more key                                                                                                                                                                                                        |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | PASS               | rule 62, skill fix-a-corrupted-page-layout, docs/05-frontend/responsive-audit.md and index entries added                                                                                                                                                                |

## Findings

Page column lacked min-w-0; card grids used viewport breakpoints beside a 256px sidebar; the portal shell lacked relative so sr-only elements stretched the document (observability blank band). All fixed.

## Open gaps

L05, L06, L08, L09, L13, L14: owner to re-open observability after deploy.

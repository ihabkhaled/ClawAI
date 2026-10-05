# QA evidence - threads-public-discovery

Batch: threads-public-discovery
Date: 2026-10-05
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | Scoped tests: frontend 10 files/55 passed; Threads API 6 files/40 passed; generation 2 files/16 passed; regression follow-up frontend 2 files/18 passed. Pre-push affected suites: 5,449 passed/4 failed; all four failures fixed and their two specs passed.         |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | Shared-types, Threads, generation and frontend typechecks passed; staged lint passed with warnings only; affected builds passed including production frontend build. A separate early shared-types ESLint invocation OOMed; final staged lint completed successfully. |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS    | `curl.exe -k -i --max-time 15` discovery and sitemap returned 200 with empty results; bogus slug returned 404 and `Cache-Control: no-store`. Threads health returned `status:ok,database:up`; migration deploy: “No pending migrations to apply.”                     |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | Docker route returned 200 by curl, but no Playwright session/screenshots were captured.                                                                                                                                                                               |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | No browser e2e spec was run; scoped unit/service specs are listed in L01.                                                                                                                                                                                             |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | Local environment has no seeded admin, paid, and FREE QA accounts for this feature.                                                                                                                                                                                   |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | No browser screenshots at device widths/orientations were captured.                                                                                                                                                                                                   |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | No owner-approved seeded article is available to complete the end-to-end flow.                                                                                                                                                                                        |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS    | Owner locale selection, public discovery, sitemap route, and private-until-owner-approved behavior covered by scoped tests and code review.                                                                                                                           |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS    | Generation uses existing credits/entitlement and requires selected spend cap; no PAYG added.                                                                                                                                                                          |
| L11  | Regression (neighbouring features still work)                           | PASS    | Scoped RSS, sitemap, metadata, discovery, generation and publication lifecycle specs passed (included in L01 counts).                                                                                                                                                 |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS    | Public results filter for approved/index-eligible publications, omit IDs, fail closed with no-store on missing slug; focused API tests passed. No account/role matrix available locally.                                                                              |
| L13  | Performance and accessibility                                           | NOT_RUN | Lighthouse/browser accessibility run was not performed; initial Next dev compilation used ~3.7 GB.                                                                                                                                                                    |
| L14  | i18n (13 locales, RTL)                                                  | PASS    | All 13 locale dictionaries and i18n typecheck updated; visual RTL coverage remains open under L07.                                                                                                                                                                    |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | Knowledge verify, audit check, QA evidence check, trace check, and sensitive-path guard passed locally; remote GitHub gates remain pending.                                                                                                                           |

## Findings

Pre-push exposed four frontend regressions: launch-surface expectations, Japanese metadata length, and implicit grid columns. Updated registry expectations, copy, and grid style; focused specs now pass 18/18. Frontend dev route returned 200 twice; initial Turbopack compilation used ~3.7 GB.

## Open gaps

L04 browser screenshots; L05 automation e2e; L06 RBAC/plan tiers; L07 device/orientation/RTL matrix; L08 UAT; L13 Lighthouse/accessibility/performance; L15 remote GitHub gates. Close with available CI/browser fixtures before release sign-off.

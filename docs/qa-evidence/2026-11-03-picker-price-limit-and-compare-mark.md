# QA evidence - picker-price-limit-and-compare-mark

Batch: picker-price-limit-and-compare-mark
Date: 2026-11-03
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                           |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | Routing router-models 21 files 381 tests passed; chat clients+access-control 163 passed; frontend parallel-model-row-cost, parallel-model-selector and rows utility 17 passed (new specs cover above, at and below the limit, no limit, outage, locked row). |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | tsc --noEmit clean in routing, chat and frontend; eslint --max-warnings 0 clean on every touched file.                                                                                                                                                       |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | Dev stack rebuilt for routing and chat. POST /chat-messages/model-access as a local Free user: gemini-2.5-flash-image allowed true, band STANDARD, covered false; claude-haiku-4-5 (at the limit) covered true; gemini-2.5-pro and opus-4-1 allowed false.   |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | The dev frontend's PostCSS compile times out while the host CPU is held by a running game (500 on /en/login after a rebuild, a restart and a cache clear). Covered by the component tests in L01 only.                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No committed e2e covers the picker.                                                                                                                                                                                                                          |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | PASS           | Free user checked live (above). Admin and paid plans have no price limit: unit test shows no routing call and every model covered.                                                                                                                           |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | Needs the browser from L04. The row reuses the single picker's fixed-height classes (truncate-fixed, shrink-0 mark).                                                                                                                                         |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Needs the browser from L04.                                                                                                                                                                                                                                  |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Closes both gaps the owner left open: the dim now follows the price limit, and the Compare picker shows the band and dims the same way.                                                                                                                      |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | Equal to the limit is covered, matching the routing guard. The rate is never returned, only a yes or no (rule 37).                                                                                                                                           |
| L11  | Regression (neighbouring features still work)                           | PASS           | The single picker and the Compare selector specs still pass; a dimmed Compare row can still be ticked, only a locked row cannot.                                                                                                                             |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | The internal route stays behind the service token; the answer carries a boolean, and a test asserts the rate string is absent. An unknown extra row in the answer is ignored.                                                                                |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | One extra internal call, only for plans with a limit, and only when the picker opens.                                                                                                                                                                        |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No new user-facing string; the existing cost-mark keys are reused.                                                                                                                                                                                           |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | ADR-162 addendum, ADR-198 amendment, service-guide-chat, chat, routing and frontend CLAUDE.md, and TD-046 updated in this change.                                                                                                                            |

## Findings

No defect found in the changed code. The dev frontend could not compile its CSS while the host CPU was busy, so the real-browser walk was not done.

## Open gaps

- L04, L07, L08: walk the Compare picker at 375, 768 and 1280 px, plus RTL, once the dev frontend compiles. Owner of the machine closes it by freeing the CPU.
- L05: no committed e2e covers the picker.

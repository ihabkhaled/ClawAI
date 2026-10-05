# QA evidence - auto-route-cost-aware-and-save-recall

Batch: auto-route-cost-aware-and-save-recall
Date: 2026-10-05
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | routing-service: 57 files / 1079 tests pass incl. 4 new cost-aware cases; chat-service: 263 files / 3553 tests pass incl. 4 new save-recall cases |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN        | eslint 0 errors on touched files; full typecheck/build left to the pre-commit and pre-push hooks                                                  |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | live stack compiles the main checkout; no curl against this change                                                                                |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | same reason, no browser lane                                                                                                                      |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no committed e2e covers AUTO cost ordering                                                                                                        |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | plan tiers not walked live; unit tests only                                                                                                       |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | no UI change                                                                                                                                      |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | not walked as a user                                                                                                                              |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | easy turns now prefer Ollama Cloud only when confirmed healthy; hard turns keep credit models; real mix not measured on prod traffic              |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN        | lowers credit spend by design; no money semantics touched; spend not measured                                                                     |
| L11  | Regression (neighbouring features still work)                           | PASS           | whole routing and chat-messages suites green after one existing test was updated on purpose                                                       |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | no new input surface; save writes still gated by the planner verdict                                                                              |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | one extra array lookup per AUTO heuristic route                                                                                                   |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no user-facing text                                                                                                                               |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | routing-engine.md updated; GitHub gates not yet read                                                                                              |

## Findings

Credit-exhausted AUTO fallback to non-credit models already works (existing test). Added: easy turns prefer confirmed-healthy Ollama Cloud (credit models for COMPLEX/EXPERT); save-intent recall net widened ('add this', 'from now on', 'store that', ...). Existing test 'offers Ollama Cloud as a fallback' changed on purpose: Ollama must now be unconfirmed to stay a fallback.

## Open gaps

L02-L06, L08-L10, L15: need the live stack running this code; next agent after deploy. Not done: SEARCH_EXTRACT still reuses fetch (no extract endpoint); free-allowance fallback not proven live.

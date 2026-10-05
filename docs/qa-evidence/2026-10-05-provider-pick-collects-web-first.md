# QA evidence - provider-pick-collects-web-first

Batch: provider-pick-collects-web-first
Date: 2026-10-05
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                           |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | chat-messages services: 23 files / 222 tests pass incl. 5 new provider cases |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN        | eslint 0 errors on touched file; typecheck and build left to hooks           |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | see Findings: live API lane run after deploy                                 |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | browser lane not run                                                         |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no committed e2e                                                             |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | plan gate covered by unit test only                                          |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | no UI change                                                                 |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | not walked as a user                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | behaviour per owner request, not verified live                               |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money change; research still needs the plan unlock                        |
| L11  | Regression (neighbouring features still work)                           | PASS           | existing research-mode specs unchanged and green                             |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | plan unlock check still runs before any research                             |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | no hot path change                                                           |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no user text                                                                 |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | GitHub gates not yet read                                                    |

## Findings

A picked search provider with mode No research was ignored, so the model answered without web data. It now collects the web first (search+fetch). SEARCH_EXTRACT was already mapped to the extract workflow in chat; only a comment was stale.

## Open gaps

Live lanes: next agent after deploy.

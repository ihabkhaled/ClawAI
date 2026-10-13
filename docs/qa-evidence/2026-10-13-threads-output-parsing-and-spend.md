# QA evidence - threads-output-parsing-and-spend

Batch: threads-output-parsing-and-spend
Date: 2026-10-13
Commits: none yet (not committed by this agent)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                              |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | claw-thread-generation-service, swc-free vitest config: 34 files, 285 tests passed. New specs: parse-model-json.utility (17), generation-pipeline.spend (7), chat-model.client.spend (9), generation-jobs.repository.spend (8). |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | run-ts7 --noEmit exit 0; eslint --max-warnings 0 on the 10 touched files exit 0. A separate build was not run; typecheck covers it.                                                                                             |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | No stack ran for this change, and the live gateway does not send costMicroUsd yet, so a curl would show 0 either way.                                                                                                           |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | No UI change; the progress field already existed.                                                                                                                                                                               |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No committed e2e covers a live Threads generation.                                                                                                                                                                              |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No permission or plan logic touched.                                                                                                                                                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                                   |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Needs a deployed round with chat-service sending costMicroUsd.                                                                                                                                                                  |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | Edge cases are decided in specs (fence, prose, nested braces, braces in strings, empty, truncated). A live Gemini round is not done.                                                                                            |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN        | Real spend needs the chat-service half (return costMicroUsd from generateOnce) and a live round. Amounts in the specs are test numbers only.                                                                                    |
| L11  | Regression (neighbouring features still work)                           | PASS           | Existing pipeline, steps, service and repository specs in the same workspace still pass (285 total).                                                                                                                            |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Parser is bounded (50 object starts, linear scan each); a reply of 5,000 broken objects returns undefined. Spend increments are integer-only; floats, negatives and unsafe numbers are dropped. No excerpt or cost is logged.   |
| L13  | Performance and accessibility                                           | NOT_RUN        | No benchmark run; the scan is linear per start and capped at 50 starts.                                                                                                                                                         |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing string or error code added.                                                                                                                                                                                      |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | Updated apps/claw-thread-generation-service/CLAUDE.md, docs/04-backend/service-guide-thread-generation.md and an ADR-173 addendum. Hooks and CI not read: nothing is committed.                                                 |

## Findings

- The service never wrote spent_micro_credits anywhere, so 0 was the only possible value. This side now adds the gateway cost per call.
- OPEN, outside this scope: chat-service generateOnce discards the settled cost (paygDisclosableCost(outcome)) and its response has no costMicroUsd. Until it returns the field, prod still shows 0. Non-PAYG (subscription) calls are undisclosed by design and stay 0.
- stripCodeFence already existed but only matched a fence spanning the whole reply, so a fence with prose around it failed. Some prod OUTPUT_INVALID may also be truncation (reasoning models spending the output reserve); parsing does not fix that.

## Open gaps

L03, L05, L08, L09, L10, L13: need the chat-service costMicroUsd change and one live Gemini round; owner: the next Threads / chat-service change.

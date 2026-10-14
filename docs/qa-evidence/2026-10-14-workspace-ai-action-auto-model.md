# QA evidence - workspace-ai-action-auto-model

Batch: workspace-ai-action-auto-model
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | workspace-service full suite with swc-free config: 107 files, 1320 tests passed (new: model-catalog-resolver 9, cloud-model-ranking 6, wiring 3, plus router, execution, client and url-guard additions)                              |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `run-ts7.mjs --noEmit` no output; eslint --max-warnings 0 on all 17 touched .ts files: no output; prettier --write by exact path. Build not run (tsc covers it)                                                                       |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | no live call: the dev container compiles main src and restarting is out of scope for this agent; production is read-only. Behaviour is covered by resolver specs against a stubbed public-catalog response                            |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | backend-only change, no UI touched                                                                                                                                                                                                    |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no committed e2e spec covers workspace AI actions; needs the live stack with a cloud connector                                                                                                                                        |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | PASS           | (unit) plan filter spec: ALLOWLIST plan keeps only the allowed model, ALLOW_ALL keeps all; entitlements outage gives coded 503. Live FREE/paid check NOT_RUN                                                                          |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | backend-only change, there is no UI to test on devices                                                                                                                                                                                |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | needs the live stack and a user on a plan with an exposed cloud model                                                                                                                                                                 |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | in code: AUTO no longer returns the local placeholder; empty result is coded 422 AI_ACTION_NO_MODEL_AVAILABLE. Billing half is NOT fixed, see Findings                                                                                |
| L10  | Business verification (money, limits, copy and claims match the code)   | FAIL           | requestId and workflow now sent so PAYG rows are distinguishable. Usage-page counts still do not move: chat-service gap, see Findings                                                                                                 |
| L11  | Regression (neighbouring features still work)                           | PASS           | the 1320-test suite covers neighbouring workspace modules (chains, approvals, actions)                                                                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | userId still comes from the token (controller), never the body; PRIVATE content no longer gets cloud models re-added by the safety net (new spec). Open: a MANUAL preferredModel is not plan-checked here or in chat-service generate |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | no UI; catalog read is cached and bounded by a 5 s timeout                                                                                                                                                                            |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no new frontend text; the new coded errors carry English sentences like AI_ACTION_UPSTREAM_FAILED, and no frontend maps either code yet                                                                                               |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | docs/04-backend/service-guide-workspace.md section added and prettier-checked. GitHub gates not read: nothing committed yet                                                                                                           |

## Findings

- Fixed: AUTO probed `/internal/connectors/config?provider=X` for a `models` field that route never returns, so the cloud chain was always empty and AUTO resolved to `local-ollama / No local model installed` (422 in production). It now reads the connector public catalog and filters by plan.
- Fixed: after a failed attempt in PRIVATE mode the safety net re-added cloud models.
- NOT fixed (chat-service): `ChatExecutionManager.settleInternalGenerate` (chat-execution.manager.ts:3420, used by `generateOnce` 3281 and `generateOnceStream` 3306) settles the PAYG hold but never calls `accessControlService.recordUsage`, which only `recordChokepointUsage` (line 3086, called from 1074, 1278, 2756) does. So token quota and request counts do not move for WORKSPACE_ACTION, review, chain draft. Workspace already sends userId, surface, requestId and workflow correctly.

## Open gaps

L03, L05, L06 (live), L08: need the live stack after a deploy; the owner of the chat-service usage fix closes the billing half.

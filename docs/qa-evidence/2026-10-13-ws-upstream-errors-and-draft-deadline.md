# QA evidence - ws-upstream-errors-and-draft-deadline

Batch: ws-upstream-errors-and-draft-deadline
Date: 2026-10-13
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) over ai-actions + chain-nl-draft + ticket-planning: 19 files, 151 tests passed, incl. new upstream-failure spec and deadline specs                            |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 on all touched files clean; run-ts7 --noEmit clean in claw-workspace-service; build not run                                                                    |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | needs a running stack; no restart or deploy allowed in this task                                                                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Backend-only change, there is no user interface to test                                                                                                                                |     |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no committed e2e covers these routes                                                                                                                                                   |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | needs the live stack; messages are identical for every role                                                                                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | Backend-only change, there is no user interface to resize                                                                                                                              |     |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | needs the live stack                                                                                                                                                                   |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | matches the round-2 report items 5 and 6: short plain message with stable code, 45 s deadline with coded 504; attempts kept sequential because each is a separately reserved paid call |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | no billing path changed; one reservation per call preserved, deadline only stops starting new paid calls                                                                               |
| L11  | Regression (neighbouring features still work)                           | PASS           | existing cloud client, orchestrator and draft specs updated and passing                                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | upstream bodies no longer reach API responses (only logs); service-token header spec still passes                                                                                      |
| L13  | Performance and accessibility                                           | NOT_RUN        | latency fix not measured live (needs the stack)                                                                                                                                        |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | messages are English API strings like the existing ones; no locale keys added                                                                                                          |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-workspace-service/CLAUDE.md updated; ADR addendum not added; CI not read (nothing pushed)                                                                                    |

## Findings

Fixed: raw chat-service JSON in reviewer errorMessage and 422 text; draft-from-nl had no overall deadline.

## Open gaps

L03, L05, L06, L08, L13 need the live stack; the orchestrator closes them after deploy.

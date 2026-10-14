# QA evidence - chat-stop-short-lane-save-sentence

Batch: chat-stop-short-lane-save-sentence
Date: 2026-10-13
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) on 6 files: 136 tests passed, incl. new executor abort-keeps-partial, cancelled-settlement arithmetic (400+ chars -> 112 tokens; cap at hold 30), short-lane and no-save-button specs |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | apps/claw-chat-service: run-ts7 --noEmit exit 0; eslint --max-warnings 0 clean on the touched files except chat-messages.service.ts, which is reverted to unchanged                                            |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | no live stack calls in this agent run (no restarts or deploys allowed); round-2 report C03/C05/C06 is the failing baseline                                                                                     |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | no browser run in this scope                                                                                                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no committed e2e covers Stop; none added                                                                                                                                                                       |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | billing arithmetic is plan independent; roles not walked                                                                                                                                                       |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | backend only change                                                                                                                                                                                            |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | not walked as a user                                                                                                                                                                                           |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | stopped marker on the stored message not done (service file has legacy lint debt)                                                                                                                              |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | settlement spec: completion = min(ceil(chars/4), hold ceiling), prompt = ceil(chars/4) of prompt text; finalize not release; release kept for no-text, timeout, error                                          |
| L11  | Regression (neighbouring features still work)                           | PASS           | chat-execution.manager and internal-generate-stream specs still green (same run as L01)                                                                                                                        |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no authz or input surface changed                                                                                                                                                                              |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | no hot path or UI change                                                                                                                                                                                       |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no user-facing keys added; lane error sentence is English like sibling lane errors                                                                                                                             |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | ADR-175 addendum and apps/claw-chat-service/CLAUDE.md updated; GitHub gates not read (nothing pushed)                                                                                                          |

## Findings

Fixed: O1 (partial text kept and billed on Stop, transport abort no longer discards state), ADR-175 open question (cancel after text settles on streamed chars), C06 (fragment reply to a long prompt shown as failed), D2 (save-button sentence removed). Open: stopped marker on the stored message; a lane test at manager level.

## Open gaps

L03, L04, L05, L06, L08, L09 NOT_RUN: live re-run by the QA owner after deploy.

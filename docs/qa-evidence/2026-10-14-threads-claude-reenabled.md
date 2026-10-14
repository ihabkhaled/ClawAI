# QA evidence: threads-claude-reenabled

Batch: threads-claude-reenabled
Date: 2026-10-14
Commits: 23d6927ef
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | swc-free vitest over apps/claw-threads-service: 112 files, 844 tests green (recommended-team.utility.spec now expects ANTHROPIC AVAILABLE; healing-pool.utility.spec drops it from the deny case).                        |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint on the three changed files exit 0; the pre-commit hook ran tsc for claw-threads-service (pass).                                                                                                                    |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | Needs the deploy: after it, GET /thread-publications/recommended-team must list ANTHROPIC models as AVAILABLE and a Claude-authored Thread must start.                                                                    |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | Picker not opened in a browser; one deny-list entry removed.                                                                                                                                                              |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e spec covers the deny list; the unit specs are the committed proof.                                                                                                                                                 |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | The plan test is unchanged; only a provider left the deny list.                                                                                                                                                           |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                             |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | The owner raised the Anthropic spend cap; the first real Claude Thread after deploy is the acceptance check.                                                                                                              |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | The owner asked for Claude to be usable again after raising the cap; HuggingFace, Groq and OpenAI stay denied on purpose (their causes are in the code comment).                                                          |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No price, limit or copy change.                                                                                                                                                                                           |
| L11  | Regression (neighbouring features still work)                           | PASS           | The full threads-service suite (L01) ran; the team builder specs still choose three distinct authors.                                                                                                                     |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | No authz, secret or input change.                                                                                                                                                                                         |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime path change.                                                                                                                                                                                                   |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text change.                                                                                                                                                                                               |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | The deny-list comment in recommended-team.constants.ts records the cause and the removal; memory entry project-provider-status-2026-10-14 saved; CI read: the first push failed only this QA check, fixed by this record. |

## Findings

- The first push of this change failed CI only on the missing QA record (rules/60); this file is that record.

## Open gaps

- L03, L04 and L08 are NOT_RUN until the change is deployed and a Claude-authored Thread runs on prod.

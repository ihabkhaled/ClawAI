# QA evidence - n3-d06b-free-meter-unpriced-thread

Batch: n3-d06b-free-meter-unpriced-thread
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) auth credit+entitlements: 25 files, 464 tests pass; shared-entitlements: 170 tests pass. New: unpriced Threads refusal x4, free release full cost x3, zero-token finalize, rate client flag, PaygMeter release independence x2              |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | run-ts7 --noEmit clean in apps/claw-auth-service and packages/shared-entitlements; eslint --max-warnings 0 clean on every touched file; prettier applied by path. No build run                                                                                       |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | no deploy or container restart allowed in this batch; the live reserve path was not called. Evidence for N-3 is a read-only SQL query on claw-pg-auth: 55 FINALIZED free calls, sum(actual_cost_micro_usd)=242805 equals credit_free_allowance_usage.spent_micro_usd |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | backend-only change, no UI touched                                                                                                                                                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no e2e spec drives the Thread reserve path locally in this batch                                                                                                                                                                                                     |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | plan-tier matrix not walked live; unit tests cover Free-allowance and wallet paths only                                                                                                                                                                              |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | backend-only change, no screen or layout touched                                                                                                                                                                                                                     |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | needs a live Free user starting a Thread on gemini-3.5-flash-lite after deploy                                                                                                                                                                                       |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | D06-b: Threads call on a fallback-priced model gets PAYG_MODEL_UNPRICED 402 before any hold (credit-reservation.manager.spec.ts). N-3: not a leak, see Findings                                                                                                      |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | money paths read: finalize settles the meter to actual cost, release returns the held cost, chat on a fallback-priced model is unchanged; meter size is a product decision left open                                                                                 |
| L11  | Regression (neighbouring features still work)                           | PASS           | whole credit and entitlements suites pass (464 tests), including the free allowance, capped allowance and Threads budget specs                                                                                                                                       |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no new input, route or permission; a refusal is stricter than before                                                                                                                                                                                                 |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | no hot path change beyond one boolean check                                                                                                                                                                                                                          |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no user-facing strings added; PAYG_MODEL_UNPRICED copy already exists                                                                                                                                                                                                |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-auth-service/CLAUDE.md and ADR-162 addendum updated. GitHub gates not read (nothing pushed)                                                                                                                                                                |

## Findings

- N-3 is not a counting leak. The local DB has 55 free calls for qa3-free2, all FINALIZED, actual costs summing to exactly the meter (242,805); they were answered (invalid or truncated output still bills tokens). Lifecycle now pinned by tests. Whether failed-but-answered calls should be free is a product decision, not changed.
- Fixed: PaygMeter.release skipped the Threads budget release when the credit release failed.
- D06-b fixed in auth-service (isFallbackRate read, Threads call refused as PAYG_MODEL_UNPRICED). A refusal at job start needs thread-generation (not in scope).

## Open gaps

L03, L05, L06, L08 need a deploy of auth-service and a live Free/Pro Thread; the owner of the round-4 live QA closes them.

# QA evidence - thread-gen-round2-output-hardening

Batch: thread-gen-round2-output-hardening
Date: 2026-10-13
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                            |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) in apps/claw-thread-generation-service: 50 files, 470 tests passed, incl. new utilities/**tests**/review-clamp-and-markup.spec.ts and manager specs for 63-char echo and same-provider fallback skip |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 on 12 touched files clean; run-ts7 --noEmit clean; build not run separately                                                                                                                           |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | no live stack call made by this agent; fixes are verified by specs only                                                                                                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | backend-only change, no UI touched                                                                                                                                                                                            |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no e2e spec covers this service                                                                                                                                                                                               |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | no auth or plan logic changed                                                                                                                                                                                                 |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | This change is backend only and has no UI, so no device matrix applies                                                                                                                                                        |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | needs a live Thread run on es/de to confirm D-L2-01/02 end to end                                                                                                                                                             |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | Untitled draft title (D-L2-10 part) lives outside this service and is not fixed here                                                                                                                                          |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money logic changed                                                                                                                                                                                                        |
| L11  | Regression (neighbouring features still work)                           | PASS           | full service suite 470/470 after updating three specs whose old behaviour (fallback throws, hash echo) was intentionally replaced                                                                                             |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no authz or secret handling changed; markup sanitiser only removes sup/sub tags                                                                                                                                               |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | no hot path or UI change                                                                                                                                                                                                      |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN        | PROVIDER_UNAVAILABLE already has a UI key; PAYG_CAP_TOO_LOW and PAYG_PRICE_UNAVAILABLE keys are for the frontend agent                                                                                                        |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-thread-generation-service/CLAUDE.md and ADR-173 addendum updated; GitHub gates not read (nothing pushed)                                                                                                            |

## Findings

Fixed D-L2-01, D-L2-02, D-L2-09 (generation side), D-L2-10 markup, D-L2-06 passthrough, N-01 backend half. Open: Untitled draft title derivation (outside this service).

## Open gaps

L03, L04, L05, L08, L09, L14 NOT_RUN: live run by the QA lead after deploy; frontend agent adds PAYG code keys.

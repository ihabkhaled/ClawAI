# QA evidence - free-generation-policy-frontend

Batch: free-generation-policy-frontend
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest run src/components/threads src/utilities/**tests**/thread-generation-progress.utility.test.ts src/lib/i18n/**tests**: 51 files, 1175 tests passed (new: 3 panel tests, 2 utility tests) |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | run-ts7 --noEmit clean; eslint --max-warnings 0 on the 6 touched source and test files exit 0; build left to the hook gate                                                                     |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | frontend display only; the budget summary contract belongs to the auth-service lane                                                                                                            |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | backend PLATFORM_FAILED and allowanceRefunded are not deployed, so no real refunded job exists to render                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no e2e spec covers a refunded failure; component tests cover it                                                                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | needs a live Free-plan platform failure from the backend change                                                                                                                                |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | no browser pass; the notice is one wrapped paragraph in the existing card, no new layout                                                                                                       |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | waits for the backend change to be live                                                                                                                                                        |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | matches the brief: not-your-fault notice when allowanceRefunded is true, Retry on us label, Spent line shows Free spend; component tests assert each                                           |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | notice shows only when the field is a real true; absent or non-boolean values show nothing (utility test)                                                                                      |
| L11  | Regression (neighbouring features still work)                           | PASS           | the 1170 existing Threads and i18n tests in the same run still pass                                                                                                                            |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no authz, secret or input path touched; text rendered through React                                                                                                                            |
| L13  | Performance and accessibility                                           | NOT_RUN        | no audit; the notice is plain text inside the existing role=alert card                                                                                                                         |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | 2 new keys in all 13 locales with real translations; thread-progress-translations test passes (key parity, placeholders)                                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-frontend/CLAUDE.md updated; GitHub gates not read, nothing pushed by this agent                                                                                                      |

## Findings

None. The shared ThreadGenerationProgress type does not declare allowanceRefunded or freeAllowanceMicroUsd yet, so the frontend reads them defensively.

## Open gaps

L04 to L08 and L13 need the deployed backend; the rounds agent closes them after deploy.

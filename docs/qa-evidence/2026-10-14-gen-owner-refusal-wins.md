# QA evidence - gen-owner-refusal-wins

Batch: gen-owner-refusal-wins
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | vitest (swc-free config) src/modules/generation: 38 files, 400 tests passed; new cases in generation-pipeline.manager.spec.ts (5 codes x 3 provider orderings, mixed deterministic+transient+cap, transient-only still retryable) |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | run-ts7 --noEmit clean; eslint --max-warnings 0 on both touched files clean; prettier applied                                                                                                                                     |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L13  | Performance and accessibility                                           | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN | Not run in this scoped backend-only fix; covered by the batch QA lane owner                                                                                                                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS    | apps/claw-thread-generation-service/CLAUDE.md updated beside NON_RETRYABLE_STEP_CODES; GitHub gates not read, nothing pushed                                                                                                      |

## Findings

requireFulfilled preferred a transient rejection over a PAYG owner refusal, so the job retried 3 times; fixed so NON_RETRYABLE_STEP_CODES win.

## Open gaps

L03-L14 not run for this scoped unit-level fix; the batch live lanes close them.

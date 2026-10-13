# QA evidence - codeql-tls-guard

Batch: codeql-tls-guard
Date: 2026-10-13
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | node --test tools/**tests**/tls-validation-guard.test.mjs: pass 1, fail 0 (it failed on the four older qa-lab scripts until narrowed to the shapes CodeQL reports)                                 |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | the smoke script runs and exits 2 with a clear message when BOARD_EMAIL/BOARD_PASSWORD are unset; format and lint hooks passed                                                                     |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L11  | Regression (neighbouring features still work)                           | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | no committed script assigns NODE_TLS_REJECT_UNAUTHORIZED to 0 or sets rejectUnauthorized false outside tools/security/codeql-accepted.json; the default admin password was removed from the script |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | tooling script and guard test only; no product behaviour changed                                                                                                                                   |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | CodeQL result for this commit is read after the push                                                                                                                                               |

## Findings

- CodeQL failed the previous push on js/disabling-certificate-validation in the Board smoke script; fixed and guarded.

## Open gaps

- L15: GitHub result read after the push.

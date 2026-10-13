# QA evidence - threads-board

Batch: threads-board
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                              |
| ---- | ----------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | NOT_RUN | Owned by the backend and frontend slices; this docs slice ran none.             |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN | Owned by the code slices; not run by the docs slice.                            |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | Live lane not run yet; needs the dev stack with the migration applied.          |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | Live lane not run yet; no browser check of /board.                              |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | No e2e spec for the Board exists yet.                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | Not run; needs roles with and without THREAD_PUBLICATIONS_MODERATE.             |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | Not run; no device or RTL check.                                                |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | Not run; acceptance not walked.                                                 |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN | Not run; owner defaults are delegate decisions awaiting owner review.           |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN | Not run; no billing path touched, copy and claims unchecked.                    |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN | Not run; neighbouring Threads pages not re-checked.                             |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | Not run; no authz, injection or revoke-takedown check.                          |
| L13  | Performance and accessibility                                           | NOT_RUN | Not run; no EXPLAIN on a 10k corpus, no axe pass.                               |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN | Not run; 13 locale keys unchecked in a browser, CJK and Thai search unverified. |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | Not run; docs written, verify script and CI not yet read.                       |

## Findings

None yet: nothing has run live.

## Open gaps

All 15 lanes are NOT_RUN. The owner of the Board work closes them when the live lane runs; this record is updated then.

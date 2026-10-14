# QA evidence - free-refund-daily-cap

Batch: free-refund-daily-cap
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | auth credit and entitlements suites 47 files / 640 tests green, incl. 3 new specs: refund stops at the daily cap and consumes the attempt, still refunds below the cap, a retried capped close is done |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 and run-ts7 --noEmit clean in apps/claw-auth-service                                                                                                                           |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L11  | Regression (neighbouring features still work)                           | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | security review finding fixed: unlimited free model calls through deliberately failing jobs are bounded by 5 refunds per user per rolling day                                                          |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | billing guard only; no UI change                                                                                                                                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | GitHub and production result read after the push                                                                                                                                                       |

## Findings

- Review finding: the Free count waiver plus unlimited platform-failure refunds let a user turn failing jobs into free calls. Capped at 5 refunds per rolling day.

## Open gaps

- L15: read after the push.

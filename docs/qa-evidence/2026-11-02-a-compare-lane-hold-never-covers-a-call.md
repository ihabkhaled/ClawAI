# QA evidence - a-compare-lane-hold-never-covers-a-call

Batch: a-compare-lane-hold-never-covers-a-call
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `vitest run` (swc-free config) on payg-credit-anthropic-cache.spec.ts and anthropic-cache-tools.spec.ts: 18 passed, incl. the new case (a remembered compare hold plus a tool catalog gives holdSuppliedByCaller true). |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` chat-service: no output; pre-commit typecheck pass; prettier applied to the changed files.                                                                                                               |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | No live run; the guard is a unit path (hold sizing), see the compare-lane-prompt-cache record.                                                                                                                          |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                           |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No committed e2e covers compare caching.                                                                                                                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No role or tier branch.                                                                                                                                                                                                 |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                           |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Needs a live compare run.                                                                                                                                                                                               |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Closes a security-review finding on the previous commit: a lane hold counted no tool catalog.                                                                                                                           |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | The premium on uncounted catalog tokens can no longer be absorbed; such a call stays uncached.                                                                                                                          |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other 17 cases in the two spec files still pass.                                                                                                                                                                    |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Narrows the cache path; no new input or endpoint.                                                                                                                                                                       |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No hot path change.                                                                                                                                                                                                     |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing string.                                                                                                                                                                                                  |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | ADR-153 amendment and chat-service CLAUDE.md updated.                                                                                                                                                                   |

## Findings

Found by the automated security review of the previous commit; fixed here.

## Open gaps

- L03/L08: live long-prefix compare (next batch). L05: no e2e.

# QA evidence - author-output-tolerance

Batch: author-output-tolerance
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | vitest (swc-free config) generation module: 368 passed, 5 failed in services/generation-jobs.service.spec.ts (other agent scope); new normalize-author-output spec 5/5 |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | eslint --max-warnings 0 on 4 touched files exit 0; prettier applied; tsc errors only in services spec of another agent                                                 |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | no live stack run in this change; unit-level contract fix only                                                                                                         |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | no live stack run in this change; unit-level contract fix only                                                                                                         |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | no live stack run in this change; unit-level contract fix only                                                                                                         |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | not exercised by this change                                                                                                                                           |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | not exercised by this change                                                                                                                                           |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | needs a live Thread generation to confirm the failure rate drops                                                                                                       |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS    | spec reproduces fenced, prose-wrapped, bare-string, {id}, missing-url and marker-derived citation shapes; out-of-evidence ids and prose still rejected                 |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN | not exercised by this change                                                                                                                                           |
| L11  | Regression (neighbouring features still work)                           | PASS    | existing generation manager/candidates/steps specs still pass                                                                                                          |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | not exercised by this change                                                                                                                                           |
| L13  | Performance and accessibility                                           | NOT_RUN | not exercised by this change                                                                                                                                           |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN | not exercised by this change                                                                                                                                           |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | service CLAUDE.md note not added in this round; no GitHub gates read                                                                                                   |

## Findings

N-4 fixed: author output normalised (citation shapes, markdown key aliases, url from evidence) and second ask quotes the refusal reason. Not verified live.

## Open gaps

L03-L08, L10, L12-L15 NOT_RUN; owner of the live QA round closes them.

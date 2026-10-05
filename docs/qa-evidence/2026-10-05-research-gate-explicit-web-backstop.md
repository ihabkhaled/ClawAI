# QA evidence - research-gate-explicit-web-backstop

Batch: research-gate-explicit-web-backstop
Date: 2026-10-05
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest: explicit-web-request.utility.spec + research-gate.service.spec = 44 passed                                                                                |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN        | Partly run: eslint 0 errors on touched files; tsc shows no errors in touched files (worktree has no generated prisma client, so other files error); build not run |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | live stack compiles the main checkout, not this worktree; no curl against the change                                                                              |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | same: dev containers do not serve this worktree                                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no committed e2e covers the research gate outage path                                                                                                             |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | no auth or plan change; hasResearchAccess still runs before the gate                                                                                              |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | no UI change                                                                                                                                                      |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | not walked as a user; covered by unit cases only                                                                                                                  |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | Partly run: fixes the 'cannot search' refusal only when the classifier is down; a classifier that says no still wins                                              |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money, limit or copy change                                                                                                                                    |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN        | Partly run: research-gate spec green; chat-messages.service spec could not load (no generated prisma client in worktree)                                          |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | bounded regexes, no new input surface, no secrets; research still behind plan gate                                                                                |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | two small regex tests per request, only on classifier failure                                                                                                     |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no user-facing text                                                                                                                                               |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Partly run: rule 50 item 8a added; GitHub gates not yet read                                                                                                      |

## Findings

Items 1-2 (credit/free-allowance fall back to free models in AUTO) and item 5 (model-decided save, ADR-134) were already implemented and tested; no change. Item 3 (cost-aware AUTO ordering) NOT done. Item 4: classifier-outage backstop added.

## Open gaps

L03, L04, L05, L08 need the live stack on this code (owner/next agent). Cost-aware AUTO routing (item 3) is open.

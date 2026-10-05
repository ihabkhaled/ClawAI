# QA evidence - threads-owner-change-request-review

Batch: threads-owner-change-request-review
Date: 2026-10-05
Commits: This report ships with its feature commit; history records the ID.
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | `npx vitest run src/repositories/threads/__tests__/thread-publications.repository.test.ts src/components/threads/__tests__/thread-change-requests.test.tsx` - 2 files, 5 tests passed. RED runs first failed because the repository methods and component were absent. |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | `apps/claw-frontend`: `npm run typecheck` exited 0; changed-file `npx eslint` exited 0; `npm run build` compiled and generated 240/240 pages.                                                                                                                          |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | `docker ps` showed `claw-threads-service` healthy and `claw-auth-service` unhealthy. No authenticated API session was available; no owner decision call/log was captured.                                                                                              |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | Auth service was unhealthy, so the owner portal could not be exercised as an authenticated user. No screenshots captured.                                                                                                                                              |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | Only focused Vitest repository/component specs were run; no Playwright e2e was run.                                                                                                                                                                                    |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | Auth service was unhealthy; role and plan-tier behavior was not exercised.                                                                                                                                                                                             |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | No authenticated browser session or viewport screenshots available.                                                                                                                                                                                                    |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | The owner portal flow could not be walked end to end while Auth was unhealthy.                                                                                                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS    | Component tests prove owners can reject with an optional response; acceptance stays disabled until content changes; acceptance includes citations and a $0.50 cap in the test case and starts the revision review callback.                                            |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS    | Acceptance uses the existing selected-cap revision API and paid safety/model review; no pay-as-you-go pricing or automatic publication was introduced.                                                                                                                 |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN | No authenticated portal regression walk was possible; only the two changed specs were run.                                                                                                                                                                             |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | Live owner-versus-other-user authorization and IDOR checks were unavailable. The UI calls existing owner-scoped endpoints; this is not runtime proof.                                                                                                                  |
| L13  | Performance and accessibility                                           | NOT_RUN | No browser performance, keyboard, or screen-reader audit captured. Controls have labels and alert/status roles in code.                                                                                                                                                |
| L14  | i18n (13 locales, RTL)                                                  | PASS    | New typed messages exist in all 13 locale dictionaries and frontend typecheck passed. RTL rendering was not tested (see L07).                                                                                                                                          |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | Product spec, plan, wiki, change record, QA evidence, generated knowledge, inventory, trace, local verification, and GitHub gates are pending final batch checks.                                                                                                      |

## Findings

Acceptance initially allowed an unchanged article. A guard now requires an edit before submitting the reader's request for paid review. The request API remains owner-scoped and the accepted revision stays private pending safety/model review and owner approval.

## Open gaps

L03-L08, L11-L13 need a healthy Auth service and authenticated browser/device QA. The QA team closes these before the owner/community interface is declared complete. L15 needs knowledge checks and post-push GitHub gate review.

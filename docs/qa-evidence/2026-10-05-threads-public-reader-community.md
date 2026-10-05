# QA evidence - threads-public-reader-community

Batch: threads-public-reader-community
Date: 2026-10-05
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | Focused Vitest run: repository, community action hook, article/community component, and citation utility specs; 4 files, 12 tests passed. Re-run recorded below after docs settle.     |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | `apps/claw-frontend`: changed-file `npx eslint` exited 0; `npm run typecheck` exited 0; `npm run build` compiled and generated 240/240 pages, including `/threads/[slug]`.             |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | No live authenticated publication/account fixture available for this UI batch.                                                                                                         |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | Browser lane and breakpoint screenshots not run yet.                                                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | No public Threads browser E2E fixture exists yet.                                                                                                                                      |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | Requires live seeded admin, paid, and free accounts; unit tests do not prove this matrix.                                                                                              |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | Requires browser screenshots across the device matrix.                                                                                                                                 |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | Live owner-approved publication and authenticated contributor flow not walked.                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS    | Reader only queries public endpoint; mutations use authenticated API; identity-free comments; accepted change requests still enter owner review.                                       |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS    | Reader actions add no generation-plan gate or PAYG pricing; accepted changes retain selected spend cap and owner approval.                                                             |
| L11  | Regression (neighbouring features still work)                           | PASS    | Existing repository spec included in focused run; frontend typecheck passed.                                                                                                           |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS    | Read and action calls use publication slug APIs; citation URLs reject non-HTTP(S); article uses existing safe Markdown renderer; comments expose no author ID. Live RBAC remains open. |
| L13  | Performance and accessibility                                           | NOT_RUN | No browser accessibility or performance audit captured yet.                                                                                                                            |
| L14  | i18n (13 locales, RTL)                                                  | PASS    | Added translation keys to all 13 locale files; frontend strict typecheck passed. Visual RTL verification remains open under L07.                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | Knowledge generation, normal push, CI and deployment evidence pending.                                                                                                                 |

## Findings

No test failures observed. Public page remains noindex until Batch 7 discovery work.

## Open gaps

L03-L08, L13 and L15 remain open; complete live API/browser/device/accessibility,
role matrix and GitHub/deployment checks during integrated QA in Batch 8.

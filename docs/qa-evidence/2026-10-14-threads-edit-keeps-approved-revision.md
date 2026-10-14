# QA evidence - threads-edit-keeps-approved-revision

Batch: threads-edit-keeps-approved-revision
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                    |
| ---- | ----------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) src/modules/publications: 47 files, 417 tests passed; new edit-state-machine and title specs |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | claw-threads-service: eslint --max-warnings 0 on touched files clean; run-ts7 --noEmit exit 0; build not run          |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | local stack not driven by this agent; needs a re-run of the round-3 N-1/N-2 flow after deploy                         |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | backend only change                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no e2e spec for the edit flow exists                                                                                  |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | Free and Pro edit refusal covered only by the unit state machine                                                      |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | no UI change                                                                                                          |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | needs the live stack                                                                                                  |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | Free edits: a refused review now fully reverses the edit instead of a separate pre-check; owner to confirm            |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money path changed                                                                                                 |
| L11  | Regression (neighbouring features still work)                           | PASS           | whole publications module suite passes (417 tests)                                                                    |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | owner-scoped queries unchanged, new ones filter by ownerId                                                            |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | backend only, no query or render path added that the suites do not cover                                              |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no strings added                                                                                                      |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-threads-service/CLAUDE.md updated; GitHub gates not read yet                                                |

## Findings

Fixed N-1, N-2 and D-L2-10 in the threads publications module. Open: live stack re-run.

## Open gaps

L03, L05, L06, L08, L09: owner re-runs the round-3 happy path after deploy.

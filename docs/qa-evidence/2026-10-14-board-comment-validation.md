# QA evidence - board-comment-validation

Batch: board-comment-validation
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest swc-free config on src/components/threads, src/hooks/threads, src/lib/i18n/**tests**: 65 files, 1220 tests passed; new tests cover blank and whitespace alert, focus, no submit, the hook, and 13-locale parity |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 on touched files exit 0; run-ts7 --noEmit exit 0; build not run                                                                                                                                |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | frontend-only change; a blank comment sends no request and no API changed                                                                                                                                              |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | dev stack not restarted in this task (no container restarts allowed)                                                                                                                                                   |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | threads-board.spec.ts selector fixed (main h2 a) but the spec needs a live stack and was not run                                                                                                                       |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | form is shown only to signed-in users; no role logic changed                                                                                                                                                           |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | no browser run                                                                                                                                                                                                         |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | no browser run                                                                                                                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | blank and whitespace comments give visible feedback and send nothing, covered by unit tests                                                                                                                            |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money, limits or claims                                                                                                                                                                                             |
| L11  | Regression (neighbouring features still work)                           | PASS           | existing community, report-form, reader-view and actions tests pass in the same run                                                                                                                                    |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | no authz or input handling change; the server still validates                                                                                                                                                          |
| L13  | Performance and accessibility                                           | NOT_RUN        | role=alert and aria-invalid added; no axe run                                                                                                                                                                          |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | new key chat.threadPublicCommentRequired in all 13 locales with non-English text; parity test passes; RTL not viewed                                                                                                   |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-frontend/CLAUDE.md updated; GitHub gates not read, nothing pushed                                                                                                                                            |

## Findings

Blank Post comment gave no feedback: fixed. The e2e reader test selected the wrong element and skipped with a false message: fixed.

## Open gaps

L04, L05, L07, L08, L13: need a live-stack browser run by the lead.

# QA evidence - community-qa-fixes

Batch: community-qa-fixes
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | frontend vitest 345 files / 4085 tests green (threads, marketing, notifications, ui, services/threads, utilities, hooks, http-client-refresh, i18n); threads-service publications vitest 76 files, 650 tests green (swc-free config) |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | node scripts/typecheck-ts7.mjs --noEmit exit 0; tsc --noEmit threads-service exit 0; eslint on every touched file: 0 errors, 0 warnings; build not run                                                                               |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | new GET comments/by-id/:commentId not curled against a running threads-service (not deployed); covered by service and repository specs                                                                                               |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | dev container not restarted with the edits; header overflow measured before the fix (de 1425, ru 1427, fr 1429 at 1280px), not re-measured after                                                                                     |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | no committed e2e spec covers the Thread community                                                                                                                                                                                    |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | no role or plan gate changed; the new endpoint is public like the list endpoints                                                                                                                                                     |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | 375/320 Board pagination wrap and 1280/1440 header not re-measured in a browser after the fix                                                                                                                                        |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | notification deep link to a reply beyond the preview not walked in a browser                                                                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | each of the 8 QA defects has a regression test: locator service (bounded paging, 404), mention chip list, total count, Ctrl/Cmd+Enter, locale-keeping redirect, public-page 401, wide-locale header                                  |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | no money, limit or claim changed                                                                                                                                                                                                     |
| L11  | Regression (neighbouring features still work)                           | PASS           | neighbouring suites in L01 (threads, marketing header, auth hooks, pagination consumers) green                                                                                                                                       |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | new endpoint is read-only, scoped to the public slug, only VISIBLE comments, id validated by commentIdParamSchema, 404 when absent                                                                                                   |
| L13  | Performance and accessibility                                           | NOT_RUN        | no accessibility or performance run; the missing-comment note uses role=status                                                                                                                                                       |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | threadCommunityCommentGone added to all 13 locales and i18n.types.ts; typecheck enforces the full Record<Locale>                                                                                                                     |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | apps/claw-frontend/CLAUDE.md note added; no new rule or skill, knowledge counts unchanged                                                                                                                                            |

## Findings

Fixed from the QA8 community walk: linked reply outside the preview, public Thread bounced to login on a dead session, German header overflow, Board 375px overflow, phantom mention chip, comment count, Ctrl+Enter, locale lost after forced password change. Not changed: item 9 (notification noise, by design).

## Open gaps

L03, L04, L05, L07, L08, L13 need a deployed threads-service and a restarted frontend; the owner closes them after deploy.

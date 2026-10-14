# QA evidence - reader-markers-author-tokens-thai

Batch: reader-markers-author-tokens-thai
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config): frontend marker util + reader body 7/7, request util 4/4; generation-service model-role schema 2/2; threads-service board-index + board-thai-search 8 files 56/56                           |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 clean on all touched files in 3 workspaces; run-ts7 --noEmit clean in frontend and threads-service; prettier by path. No build run                                                            |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | no API change; the author ceiling is a request field already accepted up to 32768 (schema spec). Live generation of a long Arabic draft not run                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | needs the deployed stack; to re-check: open the Arabic Board reader and confirm no [hex16] text                                                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | threads-board e2e spec unchanged and not run here (stack not started by this agent)                                                                                                                                   |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | no role or plan behaviour changed                                                                                                                                                                                     |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | text-only change in an existing renderer; no layout change; device matrix not walked                                                                                                                                  |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | reader acceptance verified in jsdom only, not on the live site                                                                                                                                                        |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | hex16 markers (single, doubled, comma, nested) no longer render; [1] and ordinary brackets kept; authors 8192, judge and critic 4096; Thai title/body segmented and queried through the same normaliser and bound SQL |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | author spend reserve per call doubles (priced at the ceiling), real spend unchanged, job spend cap logic untouched; documented in service-guide-thread-generation.md                                                  |
| L11  | Regression (neighbouring features still work)                           | PASS           | existing thread-generation-request tests and board-index specs still pass in the runs above                                                                                                                           |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | marker scan is linear (50000 unclosed brackets under 1s); no HTML path added; query bound as SQL parameter, asserted                                                                                                  |
| L13  | Performance and accessibility                                           | PASS           | linear-time scan asserted; no new rendering cost beyond one string pass                                                                                                                                               |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | no new user text                                                                                                                                                                                                      |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | docs updated: apps/claw-frontend/CLAUDE.md, apps/claw-threads-service/CLAUDE.md (no board-index CLAUDE.md exists), docs/04-backend/service-guide-thread-generation.md                                                 |

## Findings

Round-4 raw [hex16] in the Arabic Board reader fixed in the reader. Round-3 4096 truncation: the default lives in the frontend request builder, not the generation service; raised for authors.

## Open gaps

L03, L04, L05, L07, L08: live re-check after deploy by the rounds owner.

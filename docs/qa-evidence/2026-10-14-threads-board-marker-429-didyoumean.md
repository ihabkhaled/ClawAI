# QA evidence - threads-board-marker-429-didyoumean

Batch: threads-board-marker-429-didyoumean
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | vitest (swc-free config) src/modules/board, board-index, app: 21 files, 139 tests passed (new: marker whitespace forms, filter, did-you-mean SQL, cache header)                                   |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | eslint --max-warnings 0 on all touched files: clean; run-ts7 --noEmit in apps/claw-threads-service: clean. Build not run (no build-only change).                                                  |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | Local service not restarted (instruction: no restarts); the new filter and SQL are not live yet. Unit-level proof only.                                                                           |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | Backend-only change; frontend owned by another agent.                                                                                                                                             |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No e2e spec covers the Board 429 body or did-you-mean text; none added.                                                                                                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | Anonymous public endpoints; no role or plan logic touched.                                                                                                                                        |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                     |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Needs the deployed service; re-check prod after deploy: excerpt without marker, 429 body, "skie" suggestion.                                                                                      |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Marker scanner already stripped the spaced forms in code (probe: "[ efc2e342efd8b15e]" -> removed); the prod leak is an old indexed row. Format version bumped 3 -> 4 so reconcile re-indexes it. |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limits or claims changed (rate limits unchanged).                                                                                                                                       |
| L11  | Regression (neighbouring features still work)                           | PASS           | Existing board and board-index specs (including hostile-input timing) still green in the same run.                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | 429 body no longer names ThrottlerException; did-you-mean still reads thread_board_words only (visible titles); hostile whitespace input stays linear (spec).                                     |
| L13  | Performance and accessibility                                           | PASS           | Timing specs for unclosed-bracket and whitespace bodies under 1500 ms. s-w-r shortened 300 -> 30 s.                                                                                               |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing copy added; API message is a machine-coded English string.                                                                                                                         |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | service-guide-threads.md (429 shape, freshness window, did-you-mean, format 4) and ADR-177 cache line updated and prettier-formatted. GitHub gates not read (not committed).                      |

## Findings

- Marker leak: current code strips all spaced forms; stale prod rows need the format bump (done).
- 429 body now coded; Retry-After kept.
- Freshness: Next fetch revalidate 60 serves stale once after expiry and nothing revalidates on publish; frontend change reported to the owner.
- skie: short-word floor 0.2 with shared first letter.

## Open gaps

- L03, L05, L08: after deploy, re-check the three defects on prod (owner of the release).
- L04: not run, backend only.

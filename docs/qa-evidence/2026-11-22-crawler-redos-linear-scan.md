# QA evidence - crawler-redos-linear-scan

Batch: crawler-redos-linear-scan
Date: 2026-11-22
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | research-service `vitest run src/modules/fetch` 265/265; new `script-blocks.utility.spec.ts` 4/4 incl. 200,000 `<script>` openers with no closer and a 1,000,000-char unterminated enqueue literal, each under 1 s. |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `npm run typecheck` 0; eslint `--max-warnings 0` on the four changed files 0.                                                                                                                                       |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | Pure parsing change; the live ChatGPT/Medium/YouTube reads were proven in the previous record on the same code path, and the output shape is unchanged (spec).                                                      |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e flow change.                                                                                                                                                                                                 |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No authorization change.                                                                                                                                                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                       |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | No user-visible change.                                                                                                                                                                                             |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Closes the commit security review finding (ReDoS / event-loop DoS in the embedded-data regexes).                                                                                                                    |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money or copy change.                                                                                                                                                                                            |
| L11  | Regression (neighbouring features still work)                           | PASS           | Existing embedded-state, ChatGPT-share and thin-content specs pass unchanged (265 total).                                                                                                                           |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Lazy `[\s\S]*?` script regex replaced by a linear indexOf scanner; enqueue literal read by a linear scanner; input capped at 5,000,000 chars and 500 blocks.                                                        |
| L13  | Performance and accessibility                                           | PASS           | Hostile inputs complete in under 1 s (assertions in the spec).                                                                                                                                                      |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No strings.                                                                                                                                                                                                         |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | research-service CLAUDE.md updated; GitHub CI read after the push.                                                                                                                                                  |

## Findings

(bugs found while testing, what was fixed, what is still open and why)

## Open gaps

(every NOT_RUN or FAIL lane again, with who closes it and when)

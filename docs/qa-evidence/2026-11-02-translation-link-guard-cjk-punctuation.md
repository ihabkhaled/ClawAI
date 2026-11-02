# QA evidence - translation-link-guard-cjk-punctuation

Batch: translation-link-guard-cjk-punctuation
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | threads-service `npx vitest run src/modules/publication-translations`: 4 files / 36 tests; new case: a link followed by Japanese, Hindi or Arabic punctuation still equals the source link, and an added link is still rejected.           |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` and `eslint --max-warnings 0` clean on the module.                                                                                                                                                                          |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | Production worker log and table: the Arabic Thread `رصد-أنماط-الفشل-...` failed for ja and hi with UNEXPECTED_LINK_OR_MARKUP (2 FAILED rows, attempts 1) while every other language passed; its source holds 10 bare links and a www link. |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Worker internals only: no rendered output changed.                                                                                                                                                                                         |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No browser flow changed.                                                                                                                                                                                                                   |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No access rule changed.                                                                                                                                                                                                                    |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No layout change.                                                                                                                                                                                                                          |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner reads a sample of translations once the backfill finishes.                                                                                                                                                                           |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | After the deploy the two FAILED rows are reset to PENDING and must reach READY; the backfill must end with no FAILED row.                                                                                                                  |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or claim changed.                                                                                                                                                                                                          |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other 35 module tests pass unchanged, including the rejection of escaped, entity-encoded and protocol-relative links.                                                                                                                  |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | The guard still rejects any link, tag or script address the source does not hold; only where a link ends changed (an ASCII URL character set), and a differently written link is still a different link.                                   |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime cost change.                                                                                                                                                                                                                    |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | Covers Japanese, Hindi and Arabic sentence punctuation next to a link, the languages that failed.                                                                                                                                          |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | Knowledge delta: the constant comment in publication-translation.constants.ts states the rule; ADR-217 already describes the guard.                                                                                                        |

## Findings

The link pattern ended a link at whitespace or a bracket, so Japanese and Hindi full stops that touch a link joined it, and the guard saw a link the source did not have. A link now ends at the first non-ASCII URL character.

## Open gaps

L08 owner.

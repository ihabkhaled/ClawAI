# QA evidence - translation-link-guard-nfkc

Batch: translation-link-guard-nfkc
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | threads-service `npx vitest run src/modules/publication-translations`: 4 files / 38 tests; new case: full-width and fullwidth-digit look-alike links (`https：／／evil`, `ｗｗｗ．evil`, `//１２３.example`) are rejected. |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` and `eslint --max-warnings 0` clean on the module.                                                                                                                                                          |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | Worker internals: exercised through the unit specs; the production table is read after the deploy.                                                                                                                         |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Worker internals only: no rendered output changed.                                                                                                                                                                         |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No browser flow changed.                                                                                                                                                                                                   |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No access rule changed.                                                                                                                                                                                                    |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No layout change.                                                                                                                                                                                                          |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner reads a sample of translations once the backfill finishes.                                                                                                                                                           |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | The production backfill must finish with no FAILED row.                                                                                                                                                                    |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or claim changed.                                                                                                                                                                                          |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other 37 module tests pass unchanged, including Japanese, Hindi and Arabic punctuation next to a link.                                                                                                                 |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Both texts are folded to NFKC before links are read, so full-width forms become ASCII and are caught by the ASCII pattern; a non-ASCII host may now start with a letter, digit or mark.                                    |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | One string normalisation per translation: no measurable cost.                                                                                                                                                              |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | Japanese full-width punctuation still passes (NFKC leaves the sentence marks as they are); covered by the earlier CJK cases in the same spec.                                                                              |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | Knowledge delta: the CLAUDE.md sentence about the guard is updated; ADR-217 already describes it.                                                                                                                          |

## Findings

A review noted that full-width forms of a link and non-letter characters after `//` could pass the guard. Both texts are now NFKC-normalised before the links are read.

## Open gaps

L08 owner.

# QA evidence - translation-link-guard-non-ascii-host

Batch: translation-link-guard-non-ascii-host
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | threads-service `npx vitest run src/modules/publication-translations`: 4 files / 37 tests; new case: a link whose host starts with a non-ASCII letter (`//экзамен`, `www.пример.рф`, `https://évil`) is rejected unless the source holds the same. |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` and `eslint --max-warnings 0` clean on the module.                                                                                                                                                                                  |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | Worker internals: exercised through the unit specs; production shows the guard through the translation table after the deploy.                                                                                                                     |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Worker internals only: no rendered output changed.                                                                                                                                                                                                 |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No browser flow changed.                                                                                                                                                                                                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No access rule changed.                                                                                                                                                                                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No layout change.                                                                                                                                                                                                                                  |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner reads a sample of translations once the backfill finishes.                                                                                                                                                                                   |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | The production backfill must finish with no FAILED row; the guard now also checks look-alike hosts.                                                                                                                                                |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or claim changed.                                                                                                                                                                                                                  |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other 36 module tests pass unchanged, including the CJK, Hindi and Arabic punctuation cases that must still pass.                                                                                                                              |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Closes the review finding: the ASCII-only link pattern cannot read an internationalised or look-alike host, so every such link is compared as a whole run against the source, which also rejects swapping one look-alike host for another.         |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime cost change.                                                                                                                                                                                                                            |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | Cyrillic hosts are covered in the test; the CJK, Hindi and Arabic cases of the previous fix still pass.                                                                                                                                            |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | Knowledge delta: the pattern comment in publication-translation.constants.ts states the rule; ADR-217 already describes the guard.                                                                                                                 |

## Findings

A review noted that after the link pattern became ASCII-only, a host starting with a non-ASCII letter yields no match and so slips past the guard. A translation may now hold no more such links than its source.

## Open gaps

L08 owner.

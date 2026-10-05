# QA evidence - Threads owner portal foundation

Date: 2026-10-05
Batch: Threads owner publication portal foundation (partial Batch 6)
Verdict: PARTIAL

| Lane | What                                                         | Status  | Evidence or reason                                                                                                                    |
| ---- | ------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (changed files only)              | PASS    | Threads publication lifecycle spec: 13 tests passed; frontend i18n key references spec: 2 tests passed.                               |
| L02  | Typecheck, lint and build (touched workspaces)               | FAIL    | Threads/frontend typechecks and changed-file ESLint passed; frontend production build failed because Google Fonts could not download. |
| L03  | Manual API test (curl) with branch log line                  | NOT_RUN | No authenticated local API fixture was available for curl and matching service log evidence.                                          |
| L04  | Manual browser test (Playwright on real UI) with screenshots | NOT_RUN | No Playwright browser walk or breakpoint screenshots were captured for this portal foundation.                                        |
| L05  | Automation e2e                                               | NOT_RUN | No portal end-to-end spec exists yet; create and review flows are still unimplemented.                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)         | NOT_RUN | Multi-role and plan-tier account fixtures were unavailable for this batch.                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)            | NOT_RUN | Responsive and RTL browser checks were not run; the portal is only a list shell.                                                      |
| L08  | UAT                                                          | NOT_RUN | The owner workflow cannot be walked end to end until creation and review are implemented.                                             |
| L09  | Product verification                                         | PASS    | Owner query is capped at 50 and returns only publication ID, status, latest title, and update time.                                   |
| L10  | Business verification                                        | PASS    | Existing entitlement/credits remain unchanged; no PAYG pricing or billing behavior was added.                                         |
| L11  | Regression (neighbouring features)                           | NOT_RUN | Focused specs passed; the full frontend suite was not rerun after the locale-key fix.                                                 |
| L12  | Security (authz and IDOR, secrets, injection)                | NOT_RUN | Live cross-account authorization checks were unavailable; source query scopes results to the authenticated owner.                     |
| L13  | Performance and accessibility                                | NOT_RUN | No browser performance or accessibility audit was run for this portal foundation.                                                     |
| L14  | i18n (13 locales, RTL)                                       | NOT_RUN | All 13 locale dictionaries contain the labels and focused key-reference tests pass; RTL rendering was not visually checked.           |
| L15  | Docs, knowledge delta and GitHub gates read                  | NOT_RUN | Knowledge freshness and integrity passed in CI; CI and Lighthouse are still pending after the evidence correction.                    |

## Findings

The initial full frontend suite run covered 699 files: 5,425 passed and the i18n key-reference test failed on missing new keys. The keys were added to all 13 locale dictionaries and the focused test then passed; the full suite was not rerun. The local frontend production build could not download Google Fonts. Changed-file security scanning matched existing Japanese password-validation examples; review confirmed this diff adds only Threads labels and load-error text, with no secret data. CI's QA evidence job rejected the prior table because it did not use lane IDs; this record now follows the required L01-L15 format.

## Open gaps

L02 frontend build; L03-L08 live API, browser, e2e, role/plan, device and UAT checks; L11 full regression; L12 live authorization checks; L13 browser audits; L14 visual RTL review; L15 final CI/Lighthouse gates. These remain open until the remaining Threads portal flows and real test fixtures are available.

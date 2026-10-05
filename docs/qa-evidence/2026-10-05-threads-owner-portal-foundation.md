# QA evidence - Threads owner portal foundation

Date: 2026-10-05
Batch: Threads owner portal foundation (partial Batch 6)
Verdict: PARTIAL

| Lane                                         | Status  | Evidence                                                                                                                                                                      |
| -------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused service regression                   | PASS    | `npm exec --workspace=claw-threads-service vitest run src/modules/publications/services/__tests__/publication-lifecycle.service.spec.ts` — 13 tests passed.                   |
| Threads typecheck                            | PASS    | `npm run typecheck --workspace=claw-threads-service` — passed.                                                                                                                |
| Frontend typecheck                           | PASS    | `npm run typecheck --workspace=claw-frontend` — passed.                                                                                                                       |
| Changed-file lint                            | PASS    | ESLint on the touched TypeScript/TSX files — zero errors; existing lifecycle complexity warnings remain.                                                                      |
| Frontend i18n references                     | PASS    | `npm exec --workspace=claw-frontend vitest run src/lib/i18n/__tests__/i18n-key-references.test.ts` — 2 passed; all 13 locale dictionaries include the portal labels.          |
| Sensitive-data scan                          | PASS    | Changed-file guard flagged existing Japanese password validation examples in `ja.ts`; the diff adds only Threads labels and load-error text, with no secret data.             |
| Owner API auth/IDOR live lane                | NOT_RUN | No authenticated multi-account fixture was available in this local pass.                                                                                                      |
| Browser, responsive, RTL, accessibility, UAT | NOT_RUN | Owner list shell is implemented; full creation/review/community flow and browser walk remain open.                                                                            |
| Repository knowledge suite                   | PASS    | `npm run knowledge:test` — 409 passed, 1 skipped. Workspace version mismatch was corrected by release commit 8be788e59; focused version tests and the suite passed afterward. |
| Full frontend regression suite               | PARTIAL | Hook ran 699 files: 5,425 passed and the i18n key test failed for new keys. Keys were fixed; focused i18n test passes. Full suite not rerun.                                  |
| Frontend production build                    | FAIL    | The hook attempted `next build --turbopack` and failed because Next.js could not download Google Fonts in this environment.                                                   |
| CI, deployment, production API               | NOT_RUN | Push retry is pending the remaining scoped checks.                                                                                                                            |

The list query is owner-filtered, capped at 50 rows, and returns only publication ID, status, latest title, and update time. It omits source snapshots and generation job IDs. This evidence does not close Batch 6.

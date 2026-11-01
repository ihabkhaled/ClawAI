# QA evidence - stop-cancels-a-blocking-omni-start

Batch: stop-cancels-a-blocking-omni-start
Date: 2026-11-01
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

Scope: production showed a Stop pressed during an Omni video turn marked the row CANCELLED, then setOperation revived it to GENERATING and it finished COMPLETED. The write now only touches ACTIVE rows.

| Lane | What                                                                  | Status         | Evidence or reason                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L01  | Unit and integration tests (only the changed files)                   | PASS           | routing router-models 21 files / 378 tests (new v17 row spec); image-service image-generation 32 files / 318 tests; shared-utilities media-output-model + image-output-model 3 files / 85 tests. |
| L02  | Typecheck, lint and build (touched workspaces)                        | PASS           | `tsc --noEmit` clean on image-service and routing-service; eslint --max-warnings 0 clean on the two shared-utilities constants files.                                                            |
| L03  | Manual API test (curl) with the log line proving the branch ran       | NOT_RUN        | Needs the deploy; then resync Gemini and generate an image pinned to the model.                                                                                                                  |
| L04  | Manual browser test (Playwright against the real UI) with screenshots | NOT_RUN        | Picker check after deploy.                                                                                                                                                                       |
| L05  | Automation e2e                                                        | NOT_APPLICABLE | No e2e covers image model lists.                                                                                                                                                                 |
| L06  | RBAC across roles and plan tiers                                      | NOT_RUN        | Run on the Pro QA user after deploy.                                                                                                                                                             |
| L07  | Device matrix                                                         | NOT_APPLICABLE | No layout change.                                                                                                                                                                                |
| L08  | UAT                                                                   | NOT_RUN        | Owner walk-through pending.                                                                                                                                                                      |
| L09  | Product verification                                                  | NOT_RUN        | Whether :generateContent serves this id is unverified until the live call.                                                                                                                       |
| L10  | Business verification (money, limits, copy and claims match the code) | PASS           | Price matches the verbatim Google pricing page text, read 2026-11-01.                                                                                                                            |
| L11  | Regression                                                            | PASS           | Existing image price-key and seed specs pass in the runs above.                                                                                                                                  |
| L12  | Security                                                              | NOT_APPLICABLE | No new input, route or secret.                                                                                                                                                                   |
| L13  | Performance and accessibility                                         | NOT_APPLICABLE | Constants only.                                                                                                                                                                                  |
| L14  | i18n                                                                  | NOT_APPLICABLE | No user-facing text.                                                                                                                                                                             |
| L15  | Docs, knowledge delta and GitHub gates read                           | PASS           | Knowledge delta: apps/claw-image-service/CLAUDE.md, apps/claw-routing-service/CLAUDE.md, packages/shared-utilities/README.md.                                                                    |

## Open gaps

- Rerun Stop on an Omni turn after deploy.

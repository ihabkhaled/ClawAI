# QA evidence - prod-verification-skill

Batch: prod-verification-skill
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: DONE

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L11  | Regression (neighbouring features still work)                           | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | docs/skills only change, no code, API, UI or data touched.                                                                                                                                |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | npm run knowledge:build wrote 68 generated files; node tools/knowledge/verify.mjs: "knowledge:verify OK" (links valid). New skill, runbook, index rows and release lessons section added. |

## Findings

None. Docs only: skill verify-a-release-on-production, runbook-prod-service-crash-loop, release lessons 2026-10-14.

## Open gaps

None.

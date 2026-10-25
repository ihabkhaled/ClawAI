# QA evidence - policy-advisory

Batch: policy-advisory
Date: 2026-10-25
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `node --test tools/__tests__/ai-native-workflow.test.mjs`: 7 passed, 0 failed. `node tools/security/npm-audit.mjs`: audit OK, 0 unreviewed high/critical advisories.      |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_APPLICABLE | Only workflow YAML, root dependency metadata, and CI documentation changed; no app source changed. CI actionlint remains pending on GitHub.                               |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | No API or runtime behavior changed.                                                                                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | No user interface changed.                                                                                                                                                |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No user-facing runtime behavior changed.                                                                                                                                  |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No authorization or account behavior changed.                                                                                                                             |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No responsive interface changed.                                                                                                                                          |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | The change affects CI release gating only.                                                                                                                                |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Confirmed `policy` and `ai-native-os` are excluded from `ci-success.needs` and marked `continue-on-error`; other required jobs remain listed. Workflow-shape test passes. |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No pricing, quota, or customer-facing claim changed.                                                                                                                      |
| L11  | Regression (neighbouring features still work)                           | NOT_APPLICABLE | No product feature changed; GitHub CI run is pending after push.                                                                                                          |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | `node tools/security/npm-audit.mjs`: audit OK, 0 unreviewed high/critical advisories; multer resolves to patched 2.5.0.                                                   |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime or interface code changed.                                                                                                                                     |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text changed.                                                                                                                                              |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Release pipeline docs updated; GitHub checks and release workflow are not observable until the push completes.                                                            |

## Findings

The production audit found vulnerable multer 2.4.0; root override and lockfile now use patched 2.5.0. Policy and `ai-native-os` are advisory and excluded from the release aggregate as requested. GitHub CI verification is pending push.

## Open gaps

L02 actionlint, L11 post-push CI regression, and L15 GitHub gate verification: agent, after push completes.

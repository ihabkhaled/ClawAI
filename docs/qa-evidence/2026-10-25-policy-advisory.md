# QA evidence - policy-advisory

Batch: policy-advisory
Date: 2026-10-25
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | Workflow tests: 7 passed; agent utility tests: 20 passed; chat regression tests: 270 passed; frontend React smoke test: 3 passed. Audit OK, 0 unreviewed high/critical advisories.                   |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN        | Lint ratchets now pass for agent and chat; affected-workspace typecheck and build are pending the normal pre-push gate.                                                                              |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | No API or runtime behavior changed.                                                                                                                                                                  |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | No user interface changed.                                                                                                                                                                           |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No user-facing runtime behavior changed.                                                                                                                                                             |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No authorization or account behavior changed.                                                                                                                                                        |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No responsive interface changed.                                                                                                                                                                     |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | The change affects CI release gating only.                                                                                                                                                           |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Confirmed `policy` is excluded from `ci-success.needs` and marked `continue-on-error`; `ai-native-os` is a separate push/PR workflow. Other required jobs remain listed. Workflow-shape test passes. |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No pricing, quota, or customer-facing claim changed.                                                                                                                                                 |
| L11  | Regression (neighbouring features still work)                           | PASS           | 20 agent utility tests, 270 chat tests, and 3 frontend smoke tests passed locally after the fixes.                                                                                                   |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | `node tools/security/npm-audit.mjs`: audit OK, 0 unreviewed high/critical advisories; multer resolves to patched 2.5.0.                                                                              |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime or interface code changed.                                                                                                                                                                |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text changed.                                                                                                                                                                         |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Docs updated; corrected GitHub checks and release workflow are pending the follow-up push.                                                                                                           |

## Findings

The production audit found vulnerable multer 2.4.0; root override and lockfile now use patched 2.5.0. Policy is advisory and excluded from the release aggregate. `ai-native-os` runs independently. The first fixed workflow loaded, then CI exposed lint ratchet failures from Unicorn 78 and a React/React DOM mismatch; source simplifications and the React 19.3.1 alignment pass focused local checks.

## Open gaps

L02 affected-workspace typecheck/build and L15 GitHub gate/release verification: agent, after the follow-up push completes.

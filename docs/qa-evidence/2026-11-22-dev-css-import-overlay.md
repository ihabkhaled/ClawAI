# QA evidence - dev-css-import-overlay

Batch: dev-css-import-overlay
Date: 2026-11-22
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | NOT_APPLICABLE | Only a CSS import moved from globals.css to layout.tsx; no logic changed, and there is no unit test for stylesheet loading.                                                                             |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN        | Left to the pre-commit and pre-push hooks for the frontend workspace, per rules/23.                                                                                                                     |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | Before: frontend log `CssSyntaxError: tailwindcss: <css input>:1:1: Can't resolve '../styles/animations.css' in '/app/apps/claw-frontend'`, also after clearing `.next`. After: 0 such lines in 30 min. |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | PASS           | Before the fix a fresh browser context got the Next "Build Error" overlay, which blocked the Sign In click. The served CSS chunk now contains `keyframes shimmer` (1) and `pulse-ring` (3).             |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No e2e was run for this dev-only change.                                                                                                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | Stylesheet loading is the same for every role and plan.                                                                                                                                                 |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | PASS           | Compare walked at 375, 768 and 1280 px in en and ar after the fix: no overlay, the dev badge read "No issues", rows 44 px, dir=rtl in Arabic.                                                           |
| L08  | UAT (acceptance criteria walked as the user would)                      | PASS           | Owner ask: the dev frontend must run. `curl https://claw.local/en/login` gives 200 in 0.17 s warm, and no overlay error is logged.                                                                      |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | The cascade is unchanged: animations.css is plain unlayered CSS, loaded before globals.css exactly as before.                                                                                           |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or copy involved in a stylesheet import.                                                                                                                                                |
| L11  | Regression (neighbouring features still work)                           | PASS           | `highlight.js/styles/github.css` and `tailwindcss` imports stay in globals.css; the served CSS chunk is 252 KB with the keyframes present.                                                              |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_APPLICABLE | No input, auth or secret handling changed.                                                                                                                                                              |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | Same CSS bytes, now split across one import fewer inside Tailwind; no runtime cost.                                                                                                                     |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing string changed.                                                                                                                                                                          |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | build-system.md section 4 explains why relative imports stay out of globals.css.                                                                                                                        |

## Open gaps

- L05: no e2e was run for this dev-only change.

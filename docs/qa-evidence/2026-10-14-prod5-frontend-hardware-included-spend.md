# QA evidence - prod5-frontend-hardware-included-spend

Batch: prod5-frontend-hardware-included-spend
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason |
| ---- | ----------------------------------------------------------------------- | ------- | ------------------ |
| L01  | Unit and integration tests (only the changed files)                     | NOT_RUN | PASS               | vitest (swc-free config) hooks/local-frontier, components/threads, utilities thread-generation-progress, lib/i18n: 62 files, 1277 tests passed; new use-hardware-snapshot.test.tsx (1 call across two mounts, none when disabled) and included-usage cases in panel + utility tests. |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_RUN | PASS               | eslint --max-warnings 0 on all touched files: clean; run-ts7 --noEmit: no errors. Build not run.                                                                                                                                                                                     |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | NOT_APPLICABLE     | Frontend-only change, no API behaviour changed; prod endpoints not called.                                                                                                                                                                                                           |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | NOT_RUN            | No Playwright run against https://claw.local; covered by component tests only.                                                                                                                                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | NOT_RUN            | No e2e spec covers the progress panel spend line; none was run.                                                                                                                                                                                                                      |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | NOT_RUN            | Hardware badge stays gated by ADMIN_SYSTEM_VIEW (unchanged, existing test); no role matrix run.                                                                                                                                                                                      |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | NOT_RUN            | One inline text span added to a wrapping flex row; no device matrix run.                                                                                                                                                                                                             |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | NOT_RUN            | Not walked in a browser.                                                                                                                                                                                                                                                             |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN | PASS               | Zero-spend jobs with successful calls show "Included in your plan" (+ tokens when steps carry them); no call succeeded or real spend: unchanged. Backend items (generation-state original draft, /mine rejected title) not touched.                                                  |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN | PASS               | Real spend still shows the $ amount; included line never appears beside it (test). No pricing change.                                                                                                                                                                                |
| L11  | Regression (neighbouring features still work)                           | NOT_RUN | PASS               | Existing panel, local-frontier catalog page and gpu badge tests pass in the same run.                                                                                                                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | NOT_APPLICABLE     | No authz, input or secret surface changed.                                                                                                                                                                                                                                           |
| L13  | Performance and accessibility                                           | NOT_RUN | PASS               | Fewer requests: hardware endpoint is called once per page load, not per mount or window focus, never polled. A11y not run.                                                                                                                                                           |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN | PASS               | includedInPlan and includedInPlanTokens added to the type and all 13 locales; thread-progress-translations test and typecheck pass. RTL visual not checked.                                                                                                                          |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | NOT_RUN            | apps/claw-frontend/CLAUDE.md updated; GitHub gates not read (not committed).                                                                                                                                                                                                         |

## Findings

Fixed: admin portal re-fetched the absent /llamacpp/hardware (502) on every page mount and focus; now once per page load. Fixed: zero-spend completed drafts showed nothing; now "Included in your plan". Open (backend, not touched): generation-state returns original draft after a passing edit; /mine shows the rejected edit title.

## Open gaps

L04, L05, L06, L07, L08, L15: not run; a browser pass on https://claw.local and CI read are still owed by the committer.

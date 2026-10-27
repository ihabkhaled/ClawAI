# QA evidence - paid-model-classes

Batch: paid-model-classes
Date: 2026-10-27
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | npm run validate:affected completed successfully across the six affected test workspaces; frontend: 972 files and 9,345 tests passed. Focused plan-class tests: shared entitlements 28, auth 141, chat 33, routing 10, editor/pricing 27; locale/grid regressions 12 tests passed.    |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | `npm run validate:affected` passed lint, typecheck (19 workspaces), and tests (six affected workspaces). `npm run build --workspace=claw-frontend` passed with Webpack and generated all 258 routes. Pre-push builds passed for auth, chat, routing, thread generation, and frontend. |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | Production endpoint check omitted; no new build is deployed.                                                                                                                                                                                                                          |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | Production review UI was inspected for the separate Thread retry. Pricing UI not exercised at multiple sizes.                                                                                                                                                                         |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | Scoped unit/component specs ran; no e2e lane was run.                                                                                                                                                                                                                                 |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | Entitlement unit tests cover class allow/deny and explicit row narrowing; live role matrix not run.                                                                                                                                                                                   |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | No responsive/RTL browser matrix run.                                                                                                                                                                                                                                                 |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | Requires deployed pricing/admin experience.                                                                                                                                                                                                                                           |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS    | Catalog + shared entitlement + chat + routing + Runtime V2 tests exercise Free exclusion and paid eligibility for PREMIUM/ULTRA.                                                                                                                                                      |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS    | Catalog lists FREE/CHEAP/STANDARD for Free and all five classes for paid plans; public card text is generated from plan class data.                                                                                                                                                   |
| L11  | Regression (neighbouring features still work)                           | PASS    | Changed plan editor and pricing card/section specs passed (27 tests); shared/chat/routing/auth scoped tests passed.                                                                                                                                                                   |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS    | Runtime V2 and plan access unit tests verify denied premium model remains blocked even when an explicit model row allows it; no secret added.                                                                                                                                         |
| L13  | Performance and accessibility                                           | NOT_RUN | No performance, accessibility or screen-reader audit run.                                                                                                                                                                                                                             |
| L14  | i18n (13 locales, RTL)                                                  | PASS    | Class labels and paid-access wording are present in all 13 locale dictionaries; obsolete Pro-only Premium claims were corrected. Arabic and Persian RTL layout styles use the existing logical-direction components.                                                                  |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | Plan specification, service guides and memory updated; final knowledge/index checks and CI have not run.                                                                                                                                                                              |

## Findings

The Free class allow-set was not enforced consistently when explicit model rows
existed. The shared entitlement helper, chat access control, routing plan gate,
and Runtime V2 admission now treat cost classes as an upper bound. Existing
built-in plans are migrated only when no explicit model rows exist. Public plan cards render configured classes. New editor/pricing labels are
localized, and the remaining Pro-only premium claims have been corrected across the 13 locale files.

## Open gaps

L02-L08, L13-L15 require a production build, deployment, manual browser/API/role/device checks,
accessibility review, deployment, UAT/API/role/device checks, accessibility review, and CI. Release
operator closes these after deployment; until then verdict remains PARTIAL.

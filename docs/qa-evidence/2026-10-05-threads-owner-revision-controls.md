# QA evidence - threads-owner-revision-controls

Batch: threads-owner-revision-controls
Date: 2026-10-05
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no lane is NOT_RUN or FAIL (rules/60, rules/49).

| Lane | What                                                                    | Status  | Evidence or reason                                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS    | `npx vitest run src/utilities/__tests__/thread-revision-request.utility.test.ts src/lib/i18n/__tests__/i18n-key-references.test.ts src/lib/i18n/__tests__/translations.test.ts` — 3 files, 65 tests passed.                              |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS    | `npm run typecheck` in `apps/claw-frontend` passed; changed-file ESLint passed; `npm run build` passed after removing UTF-8 BOMs from two ignored local `node_modules` manifests that Turbopack rejected.                                |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN | Local Threads and generation health routes returned HTTP 200, but auth service rebuild fails during Prisma generation on a BOM-prefixed dependency manifest, so no authenticated owner API branch or matching owner log line was tested. |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN | The frontend served `/en/threads` with HTTP 200, but the local auth service is unhealthy and login could not be completed; no owner-flow screenshots were captured.                                                                      |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN | No Playwright end-to-end spec covers this owner revision and publication management slice yet.                                                                                                                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN | No authenticated owner sessions were available while local auth remained unhealthy.                                                                                                                                                      |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN | No authenticated browser screenshots or viewport/orientation checks were captured.                                                                                                                                                       |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN | The owner edit, cap, fresh review, approval, export, and unpublish flow could not be walked without authentication.                                                                                                                      |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS    | Revision request tests prove content trimming, citation preservation, user cap conversion to micro-USD, and invalid-input rejection; revised drafts still require fresh review and owner approval.                                       |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS    | Revision form requires a user-entered spend cap and explains that edits stay private through review; no PAYG or plan policy changed.                                                                                                     |
| L11  | Regression (neighbouring features still work)                           | PASS    | Normal pre-push hook ran the affected `claw-frontend` workspace: 701 test files, 5,430 tests passed; production build passed.                                                                                                            |
| L12  | Security (authz and IDOR, secrets, injection)                           | NOT_RUN | No authenticated cross-owner test was run; the changed repository uses existing owner-scoped revision/export/unpublish routes.                                                                                                           |
| L13  | Performance and accessibility                                           | NOT_RUN | No browser keyboard, screen-reader, contrast, reduced-motion, responsive, or performance audit was captured.                                                                                                                             |
| L14  | i18n (13 locales, RTL)                                                  | NOT_RUN | All new strings are present in 13 locale dictionaries and translation-reference tests passed; visual RTL verification remains open.                                                                                                      |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN | Plan, product spec, wiki, change record, and QA record are updated; local generated knowledge and inventory checks pass, while GitHub CI/release/deploy checks await this push.                                                          |

## Findings

The production Threads and generation containers were stale and failed compilation because they resolved old shared-type artifacts. Rebuilding only the Threads, generation, and frontend images fixed local health: both API health routes returned HTTP 200 and `/en/threads` returned HTTP 200. Local auth is still unhealthy: its image build fails during Prisma generation because an installed dependency manifest has a UTF-8 BOM. The frontend production build also initially failed on BOMs in the ignored local `@radix-ui/react-slot` and `react-hook-form` package manifests; stripping those two local BOMs allowed the scoped production build to complete. No tracked dependency files changed.

This record remains PARTIAL because authenticated API, browser, RBAC, device, accessibility, end-to-end, UAT, and final GitHub release lanes are unproven.

## Open gaps

L03-L08 and L12-L15 remain open for a full owner QA walk. Rebuild/fix local auth for browser/API checks; add an owner-flow Playwright spec; capture the device/RTL screenshots and accessibility/performance evidence; read CI, Lighthouse, release, and production deployment results after push.

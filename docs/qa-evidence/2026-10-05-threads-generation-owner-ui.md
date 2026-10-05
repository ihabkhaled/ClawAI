# QA evidence - Threads generation owner UI

Date: 2026-10-05
Batch: Threads owner generation and private review foundation
Verdict: PARTIAL

| Lane | What                                                         | Status  | Evidence or reason                                                                                                                                                    |
| ---- | ------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (changed files only)              | PASS    | Frontend request and i18n specs: 4 tests passed; Threads publication lifecycle spec: 13 tests passed.                                                                 |
| L02  | Typecheck, lint and build (touched workspaces)               | NOT_RUN | Frontend and Threads typechecks plus changed-file ESLint passed with zero errors and two existing Threads complexity warnings; frontend production build was not run. |
| L03  | Manual API test (curl) with branch log line                  | NOT_RUN | No authenticated local account token and matching service-log fixture were available for a real API probe.                                                            |
| L04  | Manual browser test (Playwright on real UI) with screenshots | NOT_RUN | No authenticated browser walk or screenshots were captured for the create, poll, and approval flow.                                                                   |
| L05  | Automation e2e                                               | NOT_RUN | No committed Playwright end-to-end flow covers Threads generation yet.                                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)         | NOT_RUN | Admin, paid, and free account fixtures were unavailable for the role and plan matrix.                                                                                 |
| L07  | Device matrix (3+ widths, both orientations, RTL)            | NOT_RUN | No device/browser sessions were used to capture the required widths, orientations, and RTL rendering.                                                                 |
| L08  | UAT                                                          | NOT_RUN | The wider Batch 6 owner and community workflow is still incomplete, so full user acceptance was not walked.                                                           |
| L09  | Product verification                                         | PASS    | The request builder test proves selected cap conversion, three author roles, Judge/Critic roles, and the approved intent version.                                     |
| L10  | Business verification                                        | PASS    | The portal requires an entered cap and discloses public/indexing intent; no PAYG or contribution entitlement gate changed.                                            |
| L11  | Regression (neighbouring features)                           | NOT_RUN | Only the matching request, i18n, and lifecycle specs ran; the whole frontend regression suite was intentionally not repeated.                                         |
| L12  | Security (authz and IDOR, secrets, injection)                | NOT_RUN | No live cross-account IDOR/API test was run; the state API remains owner-scoped and public output is unchanged.                                                       |
| L13  | Performance and accessibility                                | NOT_RUN | No browser performance, keyboard, screen-reader, contrast, reduced-motion, or responsive audit was captured.                                                          |
| L14  | i18n (13 locales, RTL)                                       | NOT_RUN | Added strings exist in all 13 locale dictionaries and i18n key tests pass; visual RTL layout verification remains open.                                               |
| L15  | Docs, knowledge delta and GitHub gates read                  | NOT_RUN | Product, frontend, request-flow, wiki, plan, trace, and QA docs are updated; local generated checks passed, while GitHub CI awaits this push.                         |

## Findings

The owner-state API now reports publication status so the UI only offers publish
approval for a `READY_FOR_REVIEW` publication. Generation output remains private
until the separate approval request succeeds. This record deliberately remains
PARTIAL because browser, live API, RBAC, device, accessibility, full regression,
and GitHub CI lanes are not yet proven. Normal pre-push hooks reported one repository-wide frontend test failure in the bounded-grid-tracks test because this new page used implicit mobile tracks; both grids now declare grid-cols-1 and the matching spec passes after the fix. The same hook's production build stopped while parsing BOM-prefixed package.json files in installed @radix-ui/react-slot and react-hook-form dependencies; the build remains unverified. The sensitive-data guard flagged two
pre-existing high-entropy Japanese password-validation examples in `ja.ts`; the
diff adds only localized Threads labels and contains no credentials or tokens.

## Open gaps

L02 production build; L03-L08 live API/browser/e2e/RBAC/device/UAT; L11 full
regression; L12 live authorization tests; L13 browser accessibility/performance;
L14 visual RTL; L15 generated artifacts and final GitHub gates. Close these
lanes as remaining owner and community UI lands.

# QA evidence - self-hosted-fonts

Batch: self-hosted-fonts
Date: 2026-10-27
Commits: self-hosted fonts (this commit)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | Full frontend vitest, exit 0: 979 files, 9407 tests; new self-hosted-fonts.test.ts (no next/font/google import anywhere, every declared woff2 and licence exists).                                   |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | typecheck-ts7 exit 0; eslint --max-warnings 0 on changed files exit 0; npm run build (Webpack) exit 0 and emitted 9 woff2 files under .next/static/media.                                            |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | No API change.                                                                                                                                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | PASS           | Real Chrome through Lighthouse 12 on the production build: /en, /en/features/threads, /ar scored best-practices 1, accessibility 1, SEO 1 with the self-hosted fonts.                                |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | The GitHub CI frontend build is the committed lane; it runs after the push (L15).                                                                                                                    |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No permission change.                                                                                                                                                                                |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | Desktop Lighthouse only; the fonts are the same files at every width. Latin subset only (as before).                                                                                                 |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | No user flow changed; typography is the same families and weights.                                                                                                                                   |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | The owner asked for core fixes: the CI frontend build failed at random inside next/font/google (Google answered with a font URL the loader could not parse); the build no longer downloads anything. |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or copy change.                                                                                                                                                                      |
| L11  | Regression (neighbouring features still work)                           | PASS           | Whole frontend suite (L01).                                                                                                                                                                          |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | No third-party request at build time; font files are @fontsource packages under the OFL, licences are committed beside them.                                                                         |
| L13  | Performance and accessibility                                           | PASS           | Accessibility 1 on the three pages; performance 0.72-0.77 locally, unchanged from before (warn-only budget).                                                                                         |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | Latin subset only, as with the Google loader; other scripts use system fallbacks as before.                                                                                                          |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Docs written (frontend CLAUDE.md); the GitHub runs are read after the push.                                                                                                                          |

## Findings

- CI run for ad30f494 failed in "Build (frontend)": next/font/google loader.js line 122 did `/\.(woff|woff2|...)$/.exec(url)[1]` on a Google font URL without an extension. A re-run passed, so it is an intermittent external variant. Self-hosting removes the dependency.

## Open gaps

- Only the latin subset is bundled (same as the Google loader configuration before).

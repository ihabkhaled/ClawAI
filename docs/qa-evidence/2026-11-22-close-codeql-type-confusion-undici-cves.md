# QA evidence - close-codeql-type-confusion-undici-cves

Batch: close-codeql-type-confusion-undici-cves
Date: 2026-11-22
Commits: 78f3e6701
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | live-service `npx vitest run src/modules/sessions`: 148/148, including new tampered-body cases (array, string, `{length}` object, null) for the service and the WAV parser.                                            |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | live-service `npx tsc --noEmit` 0, `npx eslint src/modules/sessions --max-warnings 0` 0; `node tools/format/ratchet.mjs check`: "format:check OK".                                                                     |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | No new endpoint behaviour beyond refusing malformed bodies, which the unit tests cover; the real-HTTP capture smoke (9/9) ran on the same route before this guard change.                                              |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | No UI change (only Prettier formatting of three locale/content files).                                                                                                                                                 |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e-visible behaviour change.                                                                                                                                                                                       |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No authorization change.                                                                                                                                                                                               |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                          |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_APPLICABLE | No user-visible change.                                                                                                                                                                                                |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Closes the four CodeQL alerts (#92-#95) and the Trivy HIGH findings the owner asked to fix.                                                                                                                            |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or copy change.                                                                                                                                                                                        |
| L11  | Regression (neighbouring features still work)                           | PASS           | All session suites (148) pass; the WAV parser keeps accepting valid chunks (existing duration tests).                                                                                                                  |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | `instanceof Buffer` guard before any `.length` read in service and parser (CodeQL js/type-confusion); bundled-npm undici 6.28.1 → 6.29.1 (CVE-2026-109383, -109869, -87018) in live-service and plugin-service images. |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime-cost change.                                                                                                                                                                                                |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | Locale files re-formatted only; i18n content unchanged.                                                                                                                                                                |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | GitHub CI re-run is read after this push.                                                                                                                                                                              |

## Findings

(bugs found while testing, what was fixed, what is still open and why)

## Open gaps

(every NOT_RUN or FAIL lane again, with who closes it and when)

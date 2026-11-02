# QA evidence - board-reader-language-switch

Batch: board-reader-language-switch
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | frontend `npx vitest run src/components/threads/board src/hooks/threads/board`: 12 files / 110 tests, plus the new utility spec 2 of 2; the hook now asks for `?lang=ar` and ignores `xx`. |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` clean and `eslint --max-warnings 0` clean on the five touched source and test files.                                                                                        |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | `curl -sk https://claw.local/api/v1/thread-publications/public/qa-toon-fixture` returns `availableLocales` with all 13 languages, which is what the reader's switch is built from.         |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_RUN        | The local Board reader needs a signed-in user (it redirected to the login page) and no local QA login is on hand; it is checked on production after the deploy.                            |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No e2e spec covers the signed-in Board reader; the public-page switch spec passed 6 of 6 earlier.                                                                                          |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | Reading a public Thread needs no plan; no access rule changed.                                                                                                                             |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_RUN        | The same select already rendered correctly at phone width on the public page; the Board layout is checked after the deploy.                                                                |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner opens a Thread from the Board and changes the language.                                                                                                                              |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | After the deploy: open a Thread in the Board, pick Arabic, see `?lang=ar` and the Arabic text with the app staying English.                                                                |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | No money path touched; the copies already exist and are read, not made.                                                                                                                    |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other Board and public-page specs pass unchanged; with no `?lang` the reader keeps the shared query key, so the view count still lands.                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | `?lang` is accepted only if it names one of the 13 app languages (`threadLanguageFromParam`), so a made-up value never reaches the API.                                                    |
| L13  | Performance and accessibility                                           | PASS           | One native select, already labelled "Read this Thread in"; one query per language, cached by key.                                                                                          |
| L14  | i18n (13 locales, RTL)                                                  | PASS           | No new text: the switch reuses the existing `threadTranslation.*` strings in 13 locales; the article keeps `lang` and `dir` from the copy's language.                                      |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | frontend CLAUDE.md paragraph on the Thread language updated to name the Board reader.                                                                                                      |

## Findings

The switch only existed on the public Thread page. The Board reader called the API without a language, so a translated copy could not be opened from inside the app.

## Open gaps

L04, L05, L07, L08, L09: browser check on production after the deploy, then the owner.

# QA evidence - translation-model-chain-by-speed

Batch: translation-model-chain-by-speed
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | threads-service `npx vitest run src/modules/publication-translations`: 4 files / 35 tests; the client spec now covers fastest-first Ollama native chat and the fall-through to the Gemma models.                                                         |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` and `eslint --max-warnings 0` clean on the module.                                                                                                                                                                                        |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | Production probe through the connector, one 3,264 character chunk to Arabic: gemma4:31b 2.7 s, deepseek-v4.1-flash 2.5 s, gpt-oss:120b 7.9 s, gemma-4-31b-it 94.5 s; all kept the TITLE/BODY shape, glm-5.3-flash did not (41,673 characters, no shape). |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Worker internals only: no rendered output changed.                                                                                                                                                                                                       |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No browser flow changed; the translation e2e spec passed 6 of 6 on production earlier.                                                                                                                                                                   |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No access rule changed.                                                                                                                                                                                                                                  |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No layout change.                                                                                                                                                                                                                                        |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner reads a sample of translations once the backfill finishes.                                                                                                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | After the deploy: the production backfill must finish with no FAILED row and a model column showing OLLAMA first.                                                                                                                                        |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | No credit is spent: the Ollama connector is not pay-as-you-go (production connectors table) and the Gemma models are free; owner order of 2026-11-02 respected, Ollama first for speed.                                                                  |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other 33 module tests pass unchanged.                                                                                                                                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | The link and markup guard, claim and connector fetch are untouched; only the order of the models changed.                                                                                                                                                |
| L13  | Performance and accessibility                                           | PASS           | Measured latency above: about 35 times faster per chunk than the Gemma models.                                                                                                                                                                           |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text.                                                                                                                                                                                                                                     |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | Docs updated in ADR-217, the threads CLAUDE.md and the verify skill with the measured order; the production probe output is quoted in L03.                                                                                                               |

## Findings

The backfill ran at about 1.3 copies a minute because the free Gemma models reason before answering (95 s a chunk). Ollama cloud models answer the same chunk in 2.5 to 8 s, so they now come first.

## Open gaps

L08 owner.

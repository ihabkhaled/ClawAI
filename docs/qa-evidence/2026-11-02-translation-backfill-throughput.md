# QA evidence - translation-backfill-throughput

Batch: translation-backfill-throughput
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | threads-service `npx vitest run src/modules/publication-translations`: 4 files / 35 tests (new: ordered bounded chunk pool, slot filling that does nothing while every slot is busy, claim heartbeat after each chunk). |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` clean on claw-threads-service; `eslint --max-warnings 0` clean on the whole module.                                                                                                                      |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | Needs the deploy: then read the worker log for `Translation pass` lines with several translations in flight and the READY count over time.                                                                              |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Worker internals only: no rendered output changed.                                                                                                                                                                      |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No browser flow changed; the translation e2e spec already passed 6 of 6 on production before this change.                                                                                                               |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No access rule changed; the worker reads no user data.                                                                                                                                                                  |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No layout change.                                                                                                                                                                                                       |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner walk-through after the backfill finishes.                                                                                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | The production backfill must finish with no FAILED row: 48 public Threads x 12 languages.                                                                                                                               |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | No credit is spent: the same free models in the same order; only how many calls run at once changed (6 translations, 2 chunks each).                                                                                    |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other 31 module tests pass unchanged apart from the repository mock gaining `touch`.                                                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | The link and markup guard, the claim and the connector fetch are untouched; the new `touch` only writes `started_at` of a row the worker already holds.                                                                 |
| L13  | Performance and accessibility                                           | NOT_RUN        | Provider rate limits under 6 translations at once are measured on production after the deploy (429 answers fall through to the next model).                                                                             |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text.                                                                                                                                                                                                    |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | Production evidence: after the first deploy 30 of 576 copies were READY in 35 minutes, with 80 to 280 seconds between copies of one long Thread; knowledge delta is the ADR-217 paragraph on the worker pool.           |

## Findings

Production showed the backfill would take hours: passes of 3 translations waited for the slowest, and a long Thread takes minutes per language. Fixed with a slot pool (6 in flight), two chunks at a time, a heartbeat that keeps the claim alive, and newest-first order so a Thread published today is not queued behind the backfill.

## Open gaps

L03 and L13 read on production: the backfill ran at about 5 to 10 copies a minute with 6 in flight and no 429 fallthrough needed; L08: owner.

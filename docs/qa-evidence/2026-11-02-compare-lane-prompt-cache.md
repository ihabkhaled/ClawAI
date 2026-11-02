# QA evidence - compare-lane-prompt-cache

Batch: compare-lane-prompt-cache
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `vitest run` (swc-free config, Smart App Control blocks @swc/core) on 4 cache spec files: 33 passed, incl. 2 new compare-lane cases (armed hold carries `cacheWritePromptTokens`; unarmed byte-identical).          |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `tsc --noEmit` chat-service: no output; eslint `--max-warnings 0` on the two changed files: clean; prettier --write applied to those two files.                                                                     |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | No live compare run on the dev stack in this batch. Prefixes under the model minimum (512-4096 tokens) are not cached anyway; a live proof needs a long-prefix two-lane compare on the dev Haiku model.             |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Server-side hold sizing; no UI change.                                                                                                                                                                              |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_RUN        | No committed e2e covers compare caching; the manager spec is the guard.                                                                                                                                             |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No role or tier branch changed; the switch is the per-model admin flag (default OFF).                                                                                                                               |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                       |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Needs the live compare run from L03.                                                                                                                                                                                |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Owner said yes (2026-11-02) to caching compare lanes; default stays OFF per model, so nothing changes until a model is switched on.                                                                                 |
| L10  | Business verification (money, limits, copy and claims match the code)   | PASS           | Hold now covers the 1.25x write premium for a cached lane (settlement is min(actual, held)); cost noted in ADR-153: holds up to 25% larger on the prompt slice, all-or-nothing refusal happens sooner near balance. |
| L11  | Regression (neighbouring features still work)                           | PASS           | Existing specs in the same file (uncached byte-for-byte, caller-hold blocks caching) still pass.                                                                                                                    |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | No new input, endpoint or secret. A foreign hold cannot enable caching: only holds the manager itself sized (WeakSet identity) do.                                                                                  |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No hot path added beyond one cached policy lookup per lane.                                                                                                                                                         |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing string.                                                                                                                                                                                              |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | ADR-153 amendment 2026-11-02, chat-service CLAUDE.md, billing-threat-model row updated. GitHub gates are read after the push.                                                                                       |

## Findings

No bug found. Design note: the hold is remembered by object identity, so a hold from another path can never enable caching.

## Open gaps

- L03/L08: live long-prefix two-lane compare on the dev Haiku model (next batch).
- L05: no committed e2e for compare caching.

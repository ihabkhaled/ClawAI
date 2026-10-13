# QA evidence - gates-hooks-ci-docs-overhaul

Batch: gates-hooks-ci-docs-overhaul
Date: 2026-10-13
Commits: branch chore/gates-hooks-ci-docs-overhaul (one commit per phase; see the PR)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

Scope: developer tooling only (git hooks, the affected gate runner, gate receipts, lint-staged,
ESLint/TypeScript gate configuration, CI workflows, governance docs). No service runtime code, API,
UI, data model, money path or user-facing text changes. The only workspace source added is the
`packages/shared-rabbitmq` test suite.

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `npm run knowledge:test:fast` -> `tests 432, pass 432, fail 0`; `node --test tools/__tests__/gate-correctness.test.mjs tools/__tests__/gate-receipt.test.mjs tools/__tests__/affected-ci.test.mjs` -> `tests 42, pass 42`; `npm test --workspace=@claw/shared-rabbitmq` -> `Test Files 2 passed, Tests 29 passed` (98.6% statements, 94.91% branches with `--coverage`) |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `npm run typecheck --workspace=@claw/shared-rabbitmq` exit 0; `npm run build --workspace=@claw/shared-rabbitmq` exit 0; `eslint --max-warnings 0` on both new specs exit 0; `node --check` on every new tools module -> SYNTAX_OK                                                                                                                                       |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_APPLICABLE | No HTTP endpoint, service handler or request path changed; the batch changes git hooks, CI and docs only                                                                                                                                                                                                                                                                |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | No UI change; nothing rendered by the frontend changed                                                                                                                                                                                                                                                                                                                  |
| L05  | Automation e2e (a committed or existing spec was run)                   | PASS           | The hooks themselves were run end to end as a developer runs them: `sh .husky/pre-commit` and `sh .husky/pre-push` on real staged/committed changes, timed in the table below                                                                                                                                                                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No permission, role, plan or entitlement code changed                                                                                                                                                                                                                                                                                                                   |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change                                                                                                                                                                                                                                                                                                                                                            |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Acceptance criteria are walked phase by phase; final walk recorded when the last phase lands                                                                                                                                                                                                                                                                            |
| L09  | Product verification (it does what the owner asked, edge cases decided) | NOT_RUN        | Recorded against the prompt-pack acceptance list after the last phase                                                                                                                                                                                                                                                                                                   |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit, price or marketing-claim code changed                                                                                                                                                                                                                                                                                                                  |
| L11  | Regression (neighbouring features still work)                           | PASS           | Full tooling suite 432/432 after the change (it covers affected-matrix, deploy, release, knowledge and receipt behaviour); existing `affected-ci` matrix tests unchanged and green                                                                                                                                                                                      |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Receipts can no longer be self-attested or forged (`gate-receipt.test.mjs`: other tree, lockfile, Node, tooling hash, scope and legacy formats all rejected; only the affected runner imports `recordReceipt`); npm is spawned without `shell: true`, removing the unescaped-argument path (DEP0190)                                                                    |
| L13  | Performance and accessibility                                           | PASS           | Measured timings in the table below; accessibility not applicable (no UI)                                                                                                                                                                                                                                                                                               |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text                                                                                                                                                                                                                                                                                                                                                     |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Docs updated per phase in the same commit; GitHub gates are read after the PR is opened                                                                                                                                                                                                                                                                                 |

## Measured timings (Windows 11, 28 logical cores, warm caches)

Each row is `sh .husky/<hook>` run by `time-hook.sh` (wall clock, exit code). "Before" is
`main` at 5ad48d125.

| Scenario                                           | Before | After                  |
| -------------------------------------------------- | ------ | ---------------------- |
| pre-commit, one file in claw-health-service        | 12.7s  | (after the last phase) |
| pre-push, same change                              | 20.0s  | (after the last phase) |
| pre-commit, one file in claw-chat-service          | 14.1s  | (after the last phase) |
| pre-push, same change                              | 63.5s  | (after the last phase) |
| pre-commit, one file in packages/shared-utilities  | 86.5s  | (after the last phase) |
| pre-push, same change                              | 395.8s | (after the last phase) |
| pre-commit, docs-only (docs/qa-evidence/README.md) | 7.9s   | (after the last phase) |

Component measurements:

| Step                                       | Before                          | After                                          |
| ------------------------------------------ | ------------------------------- | ---------------------------------------------- |
| ESLint, one chat-service file (cold)       | 5.2s (old `project` glob)       | 2.8s (`projectService`)                        |
| ESLint, same file, warm content cache      | n/a (no cache)                  | 1.1s                                           |
| ESLint, 4 files in 4 workspaces, 2 GB heap | OOM without the 8 GB override   | 6.2s, exit 0                                   |
| chat-service typecheck (tsgo `--noEmit`)   | 1.1s                            | 0.3s warm (`--incremental`)                    |
| shared packages, nothing changed           | rebuilt never (stale dist used) | 0.1s hash check; 3.1s full topological rebuild |
| `npm ci --dry-run` lockfile check          | not run locally                 | 1.6s clean / exit 1 in 1.8s on a mismatch      |

## Findings

- `tools/affected` turned every git error into "0 changed files": `--base=origin/DOES-NOT-EXIST`
  printed `(0 changed files)` and exited 0. Confirmed before the fix; now exits 1 with the reason.
- Pre-commit typechecked dependents of a changed shared package against the old `dist`
  (confirmed on a shared-utilities probe: no rebuild ran before the 22 typechecks).
- ESLint's `project: ['./apps/*/tsconfig.json', …]` OOMed on the default heap for a 2-file lint;
  the 8 GB override was masking it.

## Open gaps

- L08, L09: walked after the last phase lands (owner: this batch).
- L15: GitHub gates read after the PR opens (owner: this batch).
- After-timings: measured after the last phase (owner: this batch).

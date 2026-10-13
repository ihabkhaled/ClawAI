# CI/CD Pipeline

The canonical description of what GitHub Actions runs for a change, what each job
proves, and how a red job stops a release. What the local hooks run before CI, by
change type, is the gate matrix in
[rules/23](../../rules/23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type).

## Workflows

| Workflow                                                                 | Trigger                                  | Role                                                      |
| ------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| [`ci.yml`](../../.github/workflows/ci.yml)                               | every pull request; push to main/develop | The gate. `CI success` aggregates every job below.        |
| [`ai-native-os.yml`](../../.github/workflows/ai-native-os.yml)           | called by `ci.yml` (`workflow_call`)     | Knowledge, docs, QA-evidence, tooling and rehearsal gates |
| [`release.yml`](../../.github/workflows/release.yml)                     | `CI` completed successfully on main      | Version bump, tag, GitHub release, then deploy            |
| [`deploy-production.yml`](../../.github/workflows/deploy-production.yml) | called by `release.yml`                  | Deploys the exact release commit                          |
| [`lighthouse.yml`](../../.github/workflows/lighthouse.yml)               | frontend paths                           | Lighthouse CI budgets and accessibility                   |

Node comes from [`.nvmrc`](../../.nvmrc) in every workflow. Third-party actions are
pinned to commit SHAs; downloaded tools (gitleaks, actionlint) are pinned to a
version and a SHA-256.

## How a red job blocks a release

`release.yml` runs only when the `CI` workflow concluded `success` for a push to
main. `CI success` fails whenever any job it aggregates failed or was cancelled, or
when a job that applies to the change (build, merged coverage, changed-lines
coverage, Runtime V2, image scan) did not succeed. `ai-native-os` is called from
`ci.yml`, so its jobs are part of that conclusion too. Nothing reaches
production without every gate below green.

## `ci.yml` jobs

| Job                                       | Runs when                       | Proves                                                                                                                          |
| ----------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `changes`                                 | always                          | Which workspaces the diff affects (`tools/affected/index.mjs ci-matrix`); deploy paths; changed production Dockerfiles          |
| `setup`                                   | any workspace affected          | One `npm ci` (cached by OS + Node + lockfile hash), shared packages built in dependency order, every Prisma client generated    |
| `static`                                  | per affected workspace          | ESLint: no error, no warning above `tools/lint/warnings-baseline.json`; typecheck                                               |
| `test`                                    | per affected workspace (shards) | The suite passes with `--coverage`; a whole suite meets its coverage floor                                                      |
| `coverage-merge`                          | a sharded workspace was tested  | Merged shard coverage meets the workspace floor (no single shard sees the whole suite)                                          |
| `changed-lines-coverage`                  | pull requests                   | Lines the PR adds or changes in workspace source meet `changedLines` on their own                                               |
| `runtime-v2-coverage`, `runtime-v2-redis` | chat-service affected           | Runtime V2 security coverage and the Redis Lua authority                                                                        |
| `build`                                   | after static + test pass        | Each affected workspace builds                                                                                                  |
| `policy`                                  | always                          | Formatting ratchet; coverage thresholds and lint baseline never went down; production `npm audit`; actionlint (with shellcheck) |
| `secrets`                                 | always                          | gitleaks over every commit the push or PR adds, with `.gitleaks.toml`                                                           |
| `codeql`                                  | always                          | CodeQL default suite for javascript-typescript; any finding not in `tools/security/codeql-accepted.json` fails                  |
| `image-scan`                              | a production Dockerfile changed | The image builds; Trivy finds no fixable HIGH/CRITICAL vulnerability and no HIGH/CRITICAL Dockerfile misconfiguration           |
| `submodule-integrity`                     | always                          | The coding-agent submodule pointer exists upstream                                                                              |
| `ai-native-os`                            | always                          | See below                                                                                                                       |
| `CI success`                              | always                          | The aggregate above                                                                                                             |

Matrix jobs do not install or build anything themselves: the local
[`prepare`](../../.github/actions/prepare/action.yml) action restores
`node_modules` from the setup job's cache (falling back to `npm ci` on a miss) and
downloads the `build-outputs` artifact (`packages/*/dist`, `apps/*/src/generated`).
The ESLint cache and the TypeScript build info persist per workspace.

A root-invariant change (lockfile, root config, CI, tooling) or an unavailable
comparison base selects every workspace.

## `ai-native-os.yml` jobs

| Job                   | Proves                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `knowledge-freshness` | `.ai/**`, workspace `AGENTS.md` and the inventory snapshot match the tree                                                 |
| `knowledge-integrity` | `knowledge:verify` (links, docs checks, no hook bypass, contradictions, no empty suite) + coverage of the knowledge index |
| `qa-evidence`         | every feat/fix/perf product commit has a valid `docs/qa-evidence/` record (rules/60)                                      |
| `tooling-tests`       | `npm run knowledge:test:fast` — every tooling test except the deploy rehearsal                                            |
| `deploy-rehearsal`    | only when deploy paths changed: the end-to-end deploy rehearsal (`knowledge:test:rehearsal`)                              |
| `architecture-rules`  | the architecture ESLint plugin's rule tests                                                                               |

Deploy paths: `scripts/deploy*`, `tools/release/**`, `tools/__tests__/deploy-prod*`,
`docker/**`, `.github/workflows/deploy-production.yml`.

## Coverage in CI

Every suite runs with `--coverage` and the floor printed by
`node tools/coverage/thresholds.mjs flags <workspace>`. The floor is the
workspace's declared vitest threshold once the suite meets it, otherwise the
measured coverage that only rises. Policy and the dated path to 92 %:
[rules/22](../../rules/22-testing-and-coverage.md) rule 2.

## Fixing a red job

| Red job                   | Usual cause → fix                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `static` (lint)           | A new warning above the baseline in a file you changed: fix it (lint-staged would have caught it locally)                                                                       |
| `test` / `coverage-merge` | Coverage under the floor: add tests; never lower the floor or the threshold                                                                                                     |
| `changed-lines-coverage`  | The listed changed lines are not executed by any test: cover them                                                                                                               |
| `policy`                  | `npm run format:check`; a lowered threshold/floor/baseline; an unreviewed advisory (`tools/security/audit-allowlist.json` needs a reviewed, dated entry); an actionlint finding |
| `secrets`                 | A leaked secret: rotate it first, then remove it; a false positive needs a reviewed `.gitleaks.toml` entry                                                                      |
| `codeql`                  | Fix the finding; a reviewed false positive is dismissed in GitHub and listed in `tools/security/codeql-accepted.json`                                                           |
| `knowledge-freshness`     | `npm run knowledge:build && npm run audit`, commit the result                                                                                                                   |
| `knowledge-integrity`     | The listed broken link, stale generated file or contradiction                                                                                                                   |

## Adding a new workspace

`tools/affected` discovers workspaces from the root `package.json`, so a new
workspace joins every matrix automatically. Give it a vitest config with
`coverage.thresholds`, then run `node tools/coverage/thresholds.mjs sync` (records
the declared values) and, after `npm run coverage:measure -- <name>`,
`npm run coverage:raise-floors`.
A workspace with source and no spec fails `knowledge:verify`.

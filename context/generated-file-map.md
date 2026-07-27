# Generated File Map

What under `.ai/` is machine-generated (committed, never hand-edited) vs local
(gitignored), and how it is produced.

## The golden rule

**Never hand-edit a generated file.** Every generated file carries a
`"generated": true` marker (JSON) or a `<!-- GENERATED … DO NOT EDIT -->` header
(Markdown). To change its content, edit the **source** (the renderer/policy under
`tools/`) and re-run the generator. A hand-edit is overwritten on the next build
and makes the manifests untrustworthy as ground truth.

## Committed & generated — `.ai/manifests/*.json`

Produced by `npm run knowledge:build` (`tools/knowledge/build.mjs`). These are
**ground truth** for facts. The set:

| File                                         | Contains                                                      |
| -------------------------------------------- | ------------------------------------------------------------- |
| `services.json`                              | per-service dir, port, DB, models, deps, endpoint/test counts |
| `ports.json`                                 | the 16 `*_SERVICE_PORT` constants                             |
| `packages.json`                              | the 6 shared packages + internal deps                         |
| `workspaces.json`                            | full workspace inventory                                      |
| `workspace-dependency-graph.json`            | package/service dependency edges                              |
| `rabbitmq-events.json`                       | event contract detail                                         |
| `event-graph.json`                           | event pattern → producers/consumers (heuristic)               |
| `api-endpoints.json`                         | 542 endpoints across services                                 |
| `nginx-routes.json`                          | gateway prefix → service:port                                 |
| `frontend-routes.json`                       | 102 frontend pages                                            |
| `docker-services.json`                       | docker service → compose files                                |
| `permissions.json`                           | 38 permissions                                                |
| `environment-variables.json`                 | 335 env vars                                                  |
| `prisma-models.json`                         | Prisma model inventory                                        |
| `governance.json`                            | AI-entrypoint/rule/skill/doc sizes + counts                   |
| `hashes.json`                                | content hashes for drift detection                            |
| `i18n.json`, `repository.json`, `tests.json` | i18n coverage, repo meta, test-file counts                    |

## Committed & generated — other `.ai/` files

| File                                 | Producer                    | Note                                                        |
| ------------------------------------ | --------------------------- | ----------------------------------------------------------- |
| `.ai/BOOTSTRAP.md`                   | `tools/knowledge/build.mjs` | agent entrypoint; `<!-- GENERATED … DO NOT EDIT -->`        |
| `.ai/packs/*.md` + `packs/README.md` | `tools/knowledge/build.mjs` | task-pack bundles (mirror [task-router.md](task-router.md)) |

## Local & gitignored — `.ai/local/`

Produced per-task by `npm run knowledge:context` (`tools/knowledge/context.mjs`).
**Not committed.**

| File                             | Purpose                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ai/local/current-context.md`   | the resolver's output for your current task: affected workspaces, governing rules, matching skills, reviewers, related events/permissions/env, pitfalls |
| `.ai/local/current-context.json` | the same, machine-readable                                                                                                                              |

Regenerate by re-running `npm run knowledge:context -- --task="…"`.

## The generator tools (`tools/`)

| Command                                   | Tool                          | Output                                                                                   |
| ----------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run knowledge:build`                 | `tools/knowledge/build.mjs`   | all `.ai/manifests/*`, `BOOTSTRAP.md`, `packs/`                                          |
| `npm run knowledge:check`                 | `build.mjs --check`           | fails if generated knowledge is stale                                                    |
| `npm run knowledge:context`               | `tools/knowledge/context.mjs` | `.ai/local/current-context.*`                                                            |
| `npm run knowledge:verify` / `docs:check` | `tools/knowledge/verify.mjs`  | docs/governance verification                                                             |
| `npm run affected:*`                      | `tools/affected/index.mjs`    | affected-workspace lists/gates                                                           |
| `npm run audit`                           | `tools/audit/index.mjs`       | inventory audit (feeds `docs/features/ai-native-engineering-os/inventory.snapshot.json`) |
| `npm run release:preflight`               | `tools/release/preflight.mjs` | full pre-release gate                                                                    |

## Relationship to `context/`

`context/` (this layer) is **human-authored** and stable; `.ai/manifests/` is
**generated** and current. When they disagree, the manifest wins on facts —
update `context/` to match. `context/` should cite the manifests as its source,
never restate a number without a regenerable basis. See
[README.md](README.md) for the authority hierarchy.

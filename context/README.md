# ClawAI Context Layer

This directory is the **stable, human-authored structural map** of the ClawAI
monorepo. It sits between the long-form operating policy (`CLAUDE.md`) and the
machine-generated manifests under `.ai/`. Where `CLAUDE.md` tells you _how to
behave_ and the manifests tell you _what exists right now_, `context/` explains
_how the system is shaped and why_ — the parts that change slowly and that an
agent must understand before touching anything.

## What lives here

Every file is focused, cross-linked, and grounded in the generated manifests
(`.ai/manifests/*.json`) plus the real code. Nothing here is invented: ports,
events, routes, permissions, and services are all derived from ground-truth
sources and should be re-derived when they drift.

| File                                                         | Purpose                                                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| [architecture-map.md](architecture-map.md) ***               | **Canonical.** Service topology, request flow, event bus model, data ownership, layering rules.                                      |
| [stack-and-toolchain.md](stack-and-toolchain.md) ***         | **Canonical.** Exact commands: tsgo build, per-folder gate lane, jest/vitest/playwright, prisma, knowledge/affected/release, docker. |
| [codebase-navigation.md](codebase-navigation.md)             | Where to look for any given kind of code.                                                                                            |
| [task-router.md](task-router.md)                             | Maps a kind of task → rules + skills + reviewers + validation lane (mirrors `.ai/packs/`).                                           |
| [prompt-pack-intake.md](prompt-pack-intake.md)               | The seven steps that must precede code when work arrives as a prompt pack or execution prompt.                                       |
| [workspace-map.md](workspace-map.md)                         | The npm-workspace inventory (23 workspaces).                                                                                         |
| [service-catalog.md](service-catalog.md)                     | One entry per service: path, port, DB, responsibility, deps, events, pitfalls.                                                       |
| [service-dependency-map.md](service-dependency-map.md)       | Who calls whom (HTTP + events + shared packages).                                                                                    |
| [frontend-architecture.md](frontend-architecture.md)         | Next.js layering, state, i18n, styling.                                                                                              |
| [backend-architecture.md](backend-architecture.md)           | NestJS layering, module shape, error model.                                                                                          |
| [package-boundaries.md](package-boundaries.md)               | The 6 shared packages and what each owns.                                                                                            |
| [declaration-ownership-map.md](declaration-ownership-map.md) | Where types/enums/consts/DTOs/events/permissions live; over-extraction guard.                                                        |
| [request-flow-map.md](request-flow-map.md)                   | End-to-end request paths through nginx → service → DB/events.                                                                        |
| [event-flow-map.md](event-flow-map.md)                       | The RabbitMQ event graph (producers → consumers).                                                                                    |
| [database-ownership-map.md](database-ownership-map.md)       | Which service owns which database and models.                                                                                        |
| [permission-map.md](permission-map.md)                       | The 38 permissions and how they gate features.                                                                                       |
| [environment-ownership-map.md](environment-ownership-map.md) | Env-var groups and the mandatory propagation checklist.                                                                              |
| [port-and-service-map.md](port-and-service-map.md)           | The port table + the client-logs/server-logs env-only gap.                                                                           |
| [testing-map.md](testing-map.md)                             | Test runners, layout, coverage bar, gate lane.                                                                                       |
| [generated-file-map.md](generated-file-map.md)               | What under `.ai/` is generated vs local; never hand-edit.                                                                            |

## Authority hierarchy (higher wins on conflict)

When two sources disagree, resolve upward in this order. This is the same
hierarchy declared in `.ai/BOOTSTRAP.md`.

1. **`CLAUDE.md`** — long-form operating policy (the north star).
2. **`rules/00-non-negotiable-rules.md`** — engineering blockers.
3. **`context/architecture-map.md`** — structural architecture.
4. **`context/stack-and-toolchain.md`** — commands + toolchain.
5. **Numbered `rules/*`** — planning, backend, frontend, testing, infra, docs, commit, security, refactor.
6. **`skills/*`** — operational runbooks.
7. **`context/*` + `memory/*`** — this layer plus durable lessons.
8. **Generated `.ai/` manifests** — machine-readable ground truth for facts (ports, events, routes…).
9. **Compact AI-family routers** — `AGENTS.md`, `CODEX.md`, `cursor.md`.

A fact (a port, an event name, a route) always comes from the manifests. A
_rule_ (how to structure code, what to never do) always comes from `CLAUDE.md`
and `rules/`. `context/` is the bridge that explains the facts in terms of the
rules.

## How this feeds the resolver

The knowledge OS uses `context/` as a stable reference target, not as a
generated artifact:

1. You run `npm run knowledge:context -- --task="<what you are doing>"`.
2. `tools/knowledge/context.mjs` classifies the task into one of the
   `.ai/packs/` bundles and writes `.ai/local/current-context.md` (gitignored)
   with the affected workspaces, governing rules, matching skills, reviewers,
   related events/permissions/env vars, and pitfalls.
3. That local context file _links_ into `rules/`, `skills/`, and — through the
   architecture and service maps — into `context/`. The resolver keeps its
   output small ("link, don't inline"); `context/` is where those links land.

`.ai/BOOTSTRAP.md` names `context/architecture-map.md` and
`context/service-catalog.md` as the two primary "where things live" targets, so
those two files must stay accurate as the system evolves.

## Grounding rule for editors (human or agent)

Never write a port, event, route, permission, or service count into these files
from memory. Re-derive from:

- `.ai/manifests/services.json`, `ports.json`, `rabbitmq-events.json`,
  `event-graph.json`, `permissions.json`, `nginx-routes.json`,
  `frontend-routes.json`, `docker-services.json`,
  `workspace-dependency-graph.json`, `environment-variables.json`.
- The real code under `apps/` and `packages/`.

If a fact here disagrees with a freshly regenerated manifest, the manifest wins
and this file is stale — fix it. See [generated-file-map.md](generated-file-map.md).

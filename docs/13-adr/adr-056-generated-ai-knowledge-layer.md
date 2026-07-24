# ADR-056: Generated `.ai/` knowledge layer

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

Architecture facts (ports, endpoints, events, permissions, DB ownership,
nginx routes, docker services) lived only in prose across `CLAUDE.md`, service
READMEs, and the actual config files — with no way to prove the prose was
correct. The audit found this drift is real: services can silently lose a
`*_SERVICE_PORT` constant (client-logs, server-logs both did) with nothing to
flag it.

## Decision

Build `tools/knowledge/build.mjs`, which derives a committed `.ai/manifests/*`
JSON set (19 manifests: services, ports, api-endpoints, rabbitmq-events,
permissions, environment-variables, nginx-routes, docker-services,
frontend-routes, event-graph, workspace-dependency-graph, etc.) plus
`.ai/BOOTSTRAP.md` and 24 generated workspace `AGENTS.md` files — all
**derived from real source**, never hand-authored. `.ai/local/` (the per-task
context bundle) is the one gitignored exception; everything else under `.ai/`
is committed and reproducible.

## Alternatives considered

- **Hand-maintained architecture docs only.** Rejected — this is the status
  quo that drifted; no mechanism forces docs to track source.
- **Generate on every CI run, never commit.** Rejected — agents and humans need
  to read these files directly in their working tree, not only in CI logs; a
  committed artifact is also diffable in PR review.

## Consequences

- `npm run knowledge:check` fails the moment generated output stops matching
  source — drift is now a CI failure, not a silent fact.
- Adding a new manifest is additive (one function in `tools/lib/extractors.mjs`
  - one entry in `tools/lib/manifests.mjs`), not a new parallel system.
- Event producer/consumer edges in `event-graph.json` are explicitly tagged
  `confidence: unverified` (heuristic token-proximity scan) — never asserted as
  verified fact, per the "do not invent repository facts" mandate.

## Migration

`tools/audit/` (fact extraction + inventory) and `tools/knowledge/` (manifest

- router + pack generation) added this slice. `npm run knowledge:build` is
  idempotent and safe to re-run.

## Validation

`npm run knowledge:check` (freshness), `npm run knowledge:test` (19 unit tests
proving extraction correctness and byte-identical determinism across runs).

## Rollback

Delete `.ai/manifests/`, `.ai/BOOTSTRAP.md`, generated `AGENTS.md` files, and
`tools/audit/` + `tools/knowledge/`; no runtime/schema impact.

# ADR-057: Deterministic context resolver (no external AI dependency)

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

An agent starting a task in this monorepo had exactly one option: load
`CLAUDE.md` (153 KB) in full, every time, regardless of task size. There was no
mechanism to scope context to "what does THIS task actually touch."

## Decision

Build `tools/knowledge/context.mjs` (`npm run knowledge:context -- --task="..."`):
deterministic lexical/structural retrieval over the generated manifests + a
keyword-based task classifier (`tools/knowledge/classify-task.mjs`, shared with
`.ai/packs/` rendering so classifier and packs cannot drift apart). It scores
workspaces, rules, and skills by task-term overlap and writes
`.ai/local/current-context.{json,md}` — no LLM call, no external API, no
network dependency, fully reproducible from the same inputs.

## Alternatives considered

- **Embedding-based semantic retrieval as the default.** Rejected as the
  default — requires an external model/API, breaks offline/local-first use,
  and is non-deterministic across runs. Left as an explicit future opt-in
  behind a flag, with deterministic lexical retrieval remaining canonical.
- **A single static "read this first" list per workspace.** Rejected — too
  coarse; a chat-streaming task and an auth task in the same service need
  different rule/skill subsets.

## Consequences

- Works with zero external dependencies — matches ClawAI's local-first
  principle.
- Classification accuracy is only as good as the keyword tables in
  `classify-task.mjs`; unmatched tasks fall back to a safe generic
  `backend-feature` pack rather than guessing.
- `resolveContext` explicitly returns `missingInformation` when a task is too
  vague to scope — the resolver surfaces its own uncertainty instead of
  fabricating confidence.

## Migration

New capability; no existing system replaced. `.ai/local/` added to
`.gitignore` (machine-specific, regenerated on demand).

## Validation

`npm run knowledge:test` covers: classifier routing for known task shapes,
resolver output structure, budget bounds, and the missing-information flag on
an empty task.

## Rollback

Delete `tools/knowledge/context.mjs` + `classify-task.mjs`; agents fall back to
reading `CLAUDE.md` directly (the pre-existing behaviour).

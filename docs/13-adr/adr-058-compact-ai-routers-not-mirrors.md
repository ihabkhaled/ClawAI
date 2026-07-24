# ADR-058: Compact AI routers instead of full mirrors

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

Adding support for more AI coding agents (Kimi, Gemini, GLM, Qwen, DeepSeek,
Mistral, Cursor) risked repeating the `CLAUDE.md`/`CODEX.md` mirroring mistake
at N-file scale. See ADR-055 for the authority-hierarchy decision this ADR
implements structurally.

## Decision

Every per-tool file is a **compact router** (~60–90 lines): repository
identity, the authority hierarchy, the first command to run
(`npm run knowledge:context`), where things live (links only), the validation
lane, and the absolute prohibitions list. Tool-specific emphasis is a short,
clearly-labeled section (e.g. Kimi: use the resolver even with a large context
window; GLM/Qwen/DeepSeek: prefer small scoped changes; Cursor: scoped
`.cursor/rules/*.mdc` by glob). No router restates rule bodies, architecture
detail, or command lists beyond the shared compact core.

## Alternatives considered

- **One shared file, tools read it directly.** Rejected — some tools
  (Cursor) have first-class support for a specific filename/format
  (`.cursorrules`) that a single generic file can't target correctly.
- **Full per-tool mirrors (status quo).** Rejected per ADR-055.

## Consequences

- Adding a new AI-family router is a ~90-line addition, not a 100+ KB copy.
- `knowledge:verify`'s bypass scanner runs across all root-level `.md` policy
  files, so a router cannot silently reintroduce a prohibited recommendation.
- Routers make no unverifiable claims about a specific model's capabilities
  (context window size, reasoning ability) — only process guidance.

## Migration

Created this slice: `AGENTS.md`, `KIMI.md`, `GEMINI.md`, `GLM.md`, `QWEN.md`,
`DEEPSEEK.md`, `MISTRAL.md`, `.cursorrules`. `CODEX.md`/`cursor.md` retained as
larger legacy compatibility files pending a future slice that shrinks them to
the same compact-router shape (tracked in the audit's "remaining" list).

## Validation

`npm run knowledge:verify` (bypass scan across root `.md` files);
`.ai/BOOTSTRAP.md` size assertion in `tools/__tests__/knowledge.test.mjs`
(bootstrap generated content stays under a compact token budget, the same
bound routers are held to informally).

## Rollback

Delete the new router files; `CLAUDE.md` remains the sole canonical source, as
before this slice.

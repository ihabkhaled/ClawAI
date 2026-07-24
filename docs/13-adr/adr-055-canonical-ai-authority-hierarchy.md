# ADR-055: Canonical AI authority hierarchy

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: ClawAI core team
**Slice**: AI-native engineering OS, Slice 1

## Context

`CLAUDE.md`, `CODEX.md`, and `cursor.md` had grown into three large,
independently-edited files (153 KB / 119 KB / 19 KB). The audit
(`docs/features/ai-native-engineering-os/00-current-state-audit.md`) found
**170 identical section headings shared between `CLAUDE.md` and `CODEX.md`** —
near-mirrors maintained by hand, with no defined precedence when they drifted.
New per-model routers (Kimi, Gemini, GLM, Qwen, DeepSeek, Mistral) were also
needed, and copying the same 150 KB into each was clearly the wrong direction.

## Decision

Establish one explicit authority order, higher wins on conflict:

1. `CLAUDE.md` — canonical long-form operating policy
2. `rules/00-non-negotiable-rules.md` — engineering blockers
3. `context/architecture-map.md` — canonical structural architecture
4. `context/stack-and-toolchain.md` — canonical commands/toolchain
5. Numbered `rules/*` → `skills/*` → `context/*` + `memory/*`
6. Generated `.ai/manifests/*` — machine-derived facts
7. Compact AI-family routers (`AGENTS.md`, `CODEX.md`, `cursor.md`, `KIMI.md`, …)

Routers (tier 7) **route, they do not mirror**. They state the hierarchy, the
first command to run (`npm run knowledge:context`), the absolute prohibitions,
and links — never copied policy bodies. `knowledge:verify` structurally checks
routers stay within a compact size and link rather than duplicate.

## Alternatives considered

- **Keep independent per-tool files, synced by convention.** Rejected — this is
  exactly the state that produced the 170-heading mirror; "by convention" does
  not survive real editing pressure.
- **Single merged mega-file for all tools.** Rejected — different tools need
  different emphasis (context-window strategy, edit caution) and a single file
  can't express that without becoming unreadable.

## Consequences

- New per-model routers are cheap to add (~60 lines each) and cannot silently
  diverge from canonical policy without `knowledge:verify` catching the drift.
- `CODEX.md`/`cursor.md` still carry legacy detail as of this ADR; converting
  them fully into compact routers is a tracked follow-up (they were edited only
  to remove the `--no-verify` recommendations that violated tier-2 policy).

## Migration

Root `AGENTS.md` + 6 per-model routers + `.cursorrules` created in this slice,
all conforming to the hierarchy. `CLAUDE.md`, `CODEX.md`, `cursor.md` corrected
to stop recommending hook bypass (a tier-1/tier-2 contradiction).

## Validation

`npm run knowledge:verify` — link integrity + hook-bypass scan across all
canonical/router files.

## Rollback

Revert the new router files; no schema or runtime impact.

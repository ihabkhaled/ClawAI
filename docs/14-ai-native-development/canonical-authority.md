# Canonical authority

When two sources conflict, the higher tier wins:

1. `CLAUDE.md` — long-form operating policy
2. `rules/00-non-negotiable-rules.md` — hard blockers
3. `context/architecture-map.md` — structural architecture
4. `context/stack-and-toolchain.md` — commands + toolchain
5. numbered `rules/*` -> `skills/*` -> `context/*` + `memory/*`
6. generated `.ai/manifests/*`
7. compact routers (`AGENTS.md`, `CODEX.md`, `cursor.md`, per-model files)

Routers **route**; they never mirror policy. `knowledge:verify` fails if a router
re-copies canonical bodies or recommends bypassing hooks.
ADR: [adr-055](../13-adr/adr-055-canonical-ai-authority-hierarchy.md).

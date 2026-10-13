# ClawAI — Cursor notes

**Start at [`AGENTS.md`](AGENTS.md)** — the canonical router for every agent
(identity, authority order, first command, how a change lands, prohibitions,
where everything lives). This file adds only what is specific to Cursor
([ADR-168](docs/13-adr/adr-168-agents-md-is-the-canonical-router.md)).

> **Before you finish any change, update every doc it makes stale (rule 63). The hooks will reject it otherwise.**

## Cursor workflow

1. Pin `AGENTS.md` and the touched workspace's `CLAUDE.md` in the tab bar; read
   them every session. Run `npm run knowledge:context -- --task="<task>"` first.
2. Use Agent / Compose mode for multi-file changes, always with an explicit plan;
   use inline chat (Ctrl+K / Cmd+K) only for small edits inside one file.
3. Use the index to find related code before editing; never grep-replace without
   reading each hit.

## Cursor editing conventions

- Never mass-rename without reading every file first.
- Review every hunk before "Apply"; reject a diff that declares a type, enum or
  const inline in a logic file ([rules/12](rules/12-types-enums-constants-and-declaration-ownership.md)).
- A Prisma schema change ships with its migration
  ([rules/52](rules/52-every-schema-ships-a-migration.md)).
- Land through the hooks: `git add <explicit paths>` → `git commit` (with a
  `Docs:` trailer) → `git push`. What each hook runs is the gate matrix in
  [rules/23](rules/23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type).

## If Cursor suggests something contrary to the rules

The rules win. Decline a suggestion that bypasses a hook, suppresses a finding,
crosses a service database boundary, or skips the docs or the QA lanes, and say
which rule it breaks.

# 24 — Generated Files and Knowledge Freshness

## Purpose

The AI-native workflow depends on machine-readable facts staying true. The `.ai/`
manifests, Prisma clients, and knowledge context are derived artifacts — if they
drift from the code, every agent that reads them makes wrong decisions. This rule
keeps generated state fresh and never hand-edited.

## Applies to

`.ai/manifests/*.json`, `.ai/local/current-context.*`, `.ai/BOOTSTRAP.md`,
`.ai/packs/*.md`, Prisma-generated clients, and the `tools/{knowledge,audit,affected,release}` tooling.

## Mandatory rules

1. **Never hand-edit generated files.** `.ai/manifests/*`, generated Prisma
   clients, and rendered packs are outputs — change the source, then regenerate.
2. **Load context before working:** `npm run knowledge:context -- --task="…"`
   writes `.ai/local/current-context.md` (the affected services/routes/events/i18n
   for your task). Read it; do not guess the blast radius.
3. **Regenerate after structural change.** New service/route/event/env/permission/
   i18n key → rebuild the knowledge base (`npm run knowledge:build`) so the
   manifests match reality.
4. **Verify freshness before commit:** `npm run knowledge:check` /
   `knowledge:verify` must pass — they detect manifest ⇄ code drift (hashes in
   `.ai/manifests/hashes.json`).
5. **Prisma clients are regenerated, not edited** — schema change → migration →
   `prisma generate`; the generated client is never patched by hand.
6. **Manifests are read-only inputs to reasoning**, not a place to record intent —
   put intent in the plan (`.claude/Integrations/…`) and let generation reflect it.

## Prohibited patterns

- Editing a `.ai/manifests/*.json` by hand to "fix" a value.
- Committing code that changes routes/events/env without regenerating the knowledge base.
- Skipping `knowledge:context` and inferring affected services manually.
- Modifying a generated Prisma client file.

## Correct pattern

```bash
# after adding a route/event/env var:
npm run knowledge:build          # regenerate .ai/manifests/*
npm run knowledge:check          # 0 drift vs code
# routine, before any task:
npm run knowledge:context -- --task="add workspace webhook retry"
```

## Enforcement

- **Knowledge check** — `knowledge:check` / `knowledge:verify` fail on drift.
- **CI job** — knowledge verification runs in CI; stale manifests fail the build.
- **Review checklist** — no hand-edits to generated artifacts.

## Related skills

- [01-codebase-navigation](../skills/01-codebase-navigation.md)

## Related context

- `.ai/BOOTSTRAP.md`, `.ai/manifests/hashes.json`, `.ai/manifests/repository.json`.
- Root `CLAUDE.md` — Knowledge OS references.

## Definition of done

- [ ] `knowledge:context` loaded before the task.
- [ ] Knowledge base regenerated after any structural change; `knowledge:check` clean.
- [ ] No generated file (manifest or Prisma client) hand-edited.

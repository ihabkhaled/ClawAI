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

## Generated artifacts are a HARD GATE (never optional)

`.ai/**`, every workspace `AGENTS.md`, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` are
**generated from the tree**. CI verifies them on every push:

| CI job              | Command                    | Fails when                                                           |
| ------------------- | -------------------------- | -------------------------------------------------------------------- |
| Knowledge freshness | `npm run knowledge:check`  | a generated file's hash no longer matches the tree                   |
| Knowledge integrity | `npm run knowledge:verify` | stale file, broken link, orphan reviewer, hook-bypass, contradiction |
| Inventory audit     | `npm run audit:check`      | the inventory snapshot hash has drifted                              |

**A stale artifact turns the build red on every subsequent push**, for everyone,
until someone regenerates it. It is not a warning and it is not deferrable.

### The rule

Any commit that touches `packages/**`, `apps/**`, `infra/**`, `docker/**`,
`docs/**`, `scripts/**`, `rules/**`, `skills/**`, `tools/**` or `.env.example`
MUST regenerate and stage:

```bash
npm run knowledge:build      # rewrites .ai/** + workspace AGENTS.md
npm run audit                # rewrites the inventory snapshot
git add .ai docs/features/ai-native-engineering-os/inventory.snapshot.json
git add apps/*/AGENTS.md packages/*/AGENTS.md 2>/dev/null
npm run knowledge:verify     # what CI runs
npm run audit:check          # what CI runs
```

The pre-commit hook now does all of this **automatically**, so in normal use
there is nothing to remember. The rule is written down because the hook can be
skipped (it must not be) and because a red CI needs a documented fix.

### Order matters — regenerate AFTER formatting, never before

This is the mistake that actually caused a red build:

1. `npm run knowledge:build` — hashes the current bytes
2. `git add` / commit — **lint-staged reformats the staged files**
3. the reformatted bytes no longer match the hashes recorded in step 1
4. `knowledge:check` passes locally (it ran before the reformat) but
   `knowledge:verify` fails in CI

Generators must run **after** prettier and `eslint --fix` have settled. The
pre-commit hook is ordered that way deliberately: lint-staged is step 1,
regeneration is step 2.

### Never hand-edit a generated artifact

If a generated file is wrong, fix the **generator or its input**, then
regenerate. Editing `.ai/manifests/*.json` or a workspace `AGENTS.md` by hand is
overwritten on the next build and hides the real problem.

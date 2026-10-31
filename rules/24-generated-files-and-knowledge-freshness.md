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

**The hook does this; run it by hand only to fix a red CI.** pre-commit step 3
(`node tools/affected/index.mjs knowledge --record`) regenerates the knowledge
layer and the inventory snapshot, stages them, and runs the `knowledge:verify`
checks in the same pass, on every commit. There is nothing to remember and
nothing to run before committing.

When CI's `knowledge-freshness` or `knowledge-integrity` job is red (a commit
that came from somewhere the hook did not run — a rebase, a web edit, a bot),
regenerate and commit:

```bash
npm run knowledge:build      # rewrites .ai/** + workspace AGENTS.md
npm run audit                # rewrites the inventory snapshot
git add .ai docs/features/ai-native-engineering-os/inventory.snapshot.json
git add apps/*/AGENTS.md packages/*/AGENTS.md
npm run knowledge:verify     # what CI runs
```

### Order matters — regenerate AFTER formatting, never before

This is the mistake that actually caused a red build:

1. `npm run knowledge:build` — hashes the current bytes
2. `git add` / commit — **lint-staged reformats the staged files**
3. the reformatted bytes no longer match the hashes recorded in step 1
4. `knowledge:check` passes locally (it ran before the reformat) but
   `knowledge:verify` fails in CI

Generators must run **after** prettier and `eslint --fix` have settled. The
pre-commit hook is ordered that way deliberately: lint-staged is step 1,
regeneration is step 3.

### Never hand-edit a generated artifact

If a generated file is wrong, fix the **generator or its input**, then
regenerate. Editing `.ai/manifests/*.json` or a workspace `AGENTS.md` by hand is
overwritten on the next build and hides the real problem.

### Count fragments are staged by the hook

Docs that carry generated test/workspace counts (`context/testing-map.md`, `context/workspace-map.md`, `docs/15-ai-context/ai-context-pack.md`, the wiki pages) are rewritten by `knowledge:build`. The pre-commit knowledge step now stages them (ADR-202, `tools/knowledge/count-fragments.mjs` `listFragmentDocs`), so pre-push never finds a stale count; if one is still stale, `git push` regenerates and commits it as `chore(knowledge): refresh generated files`.

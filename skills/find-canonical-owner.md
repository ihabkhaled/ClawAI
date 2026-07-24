---
name: find-canonical-owner
summary: Determine which service, package, or file is the single canonical owner of a fact, type, or piece of logic before adding a second copy.
task_keywords:
  [
    owner,
    ownership,
    canonical,
    source of truth,
    duplicate,
    where does this belong,
    which service owns,
  ]
applies_to: [all-workspaces, monorepo-root]
required_rules:
  [02-monorepo-and-workspace-ownership, 14-shared-packages, 03-microservice-boundaries]
required_context: [package-boundaries, declaration-ownership-map, service-catalog]
affected_workspaces: [none-read-only]
required_tests: [none-read-only]
required_docs: [none]
validation_lane: npm run knowledge:context -- --task="..." (read-only)
---

## When to use

Before writing a new type, constant, utility, DTO, or service method, you
suspect it might already exist somewhere else in the monorepo. Use this skill
to confirm the canonical owner (or confirm there isn't one yet) rather than
duplicating it — this is the mechanical check behind
[`../rules/25-exceptions-and-waivers.md`](../rules/25-exceptions-and-waivers.md)'s
"no undocumented duplication" expectation and the `reuse-before-creating` skill.

## When NOT to use

If you already know the owner from `.ai/local/current-context.md`, skip
straight to editing it. This skill is for the "is this already owned
somewhere?" uncertainty case, not routine navigation (`navigate-codebase.md`).

## Read first

- [`../context/package-boundaries.md`](../context/package-boundaries.md) — which shared package owns which kind of thing
- [`../context/declaration-ownership-map.md`](../context/declaration-ownership-map.md) — types/enums/consts/DTOs homes
- `.ai/manifests/services.json`, `.ai/manifests/packages.json` — generated ownership facts

## Repository discovery steps

1. Classify what you're about to add: a **type/enum/DTO** (check
   `packages/shared-types` first), a **cross-service constant** (check
   `packages/shared-constants`), a **cross-service function** (check
   `packages/shared-utilities`), or **service-specific logic** (it belongs in
   that one service, not shared).
2. Grep for the concept's name across `packages/*/src` and the likely owning
   service's `src/common/`.
3. Check `.ai/manifests/prisma-models.json` / `mongoose-models.json` if it's a
   data shape — the model's owning service is authoritative.
4. If two services independently define something similar, that is itself a
   finding — flag it for `remove-duplicate-code.md`, don't silently pick one.

## Tests-first plan

N/A — read-only investigation. If the outcome is "yes, this should move to a
shared package," that move needs its own tests per
[`../rules/14-shared-packages.md`](../rules/14-shared-packages.md).

## Implementation steps

1. Search `packages/*/src` for the concept by name and near-synonyms.
2. Search the candidate owning service(s) `src/common/{types,enums,constants,utilities}`.
3. If found once: that's the owner — import it, do not redefine it.
4. If found in 2+ places identically: it's a bug (rule 23 "shared-utilities-first
   mindset" in `CLAUDE.md`) — consolidate into the shared package and replace
   both copies with imports.
5. If found nowhere: you're the first — place it per
   `declaration-ownership-map.md`, not inline in a logic file.

## Security considerations

None beyond standard review — this is a discovery step.

## Failure modes

- Grepping only the current service and missing a shared-package owner →
  duplicate definition, later flagged by `remove-duplicate-code`.
- Assuming "service-specific" too early for something that's actually
  domain-neutral (HTTP, JWT, crypto, retry/backoff, URL safety) — these belong
  in `packages/shared-utilities`, not a per-service copy.

## Validation commands

```
npm run knowledge:context -- --task="find owner of <concept>"
```

## Documentation updates

None for the lookup itself. If you consolidate a duplicate, update both
services' `AGENTS.md` will regenerate automatically via `npm run knowledge:build`.

## Definition of done

You can name the single file that owns the concept, or you have confirmed no
owner exists yet and placed it correctly per the ownership map.

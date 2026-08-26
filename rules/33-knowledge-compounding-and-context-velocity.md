# 33 — Knowledge Compounding and Context Velocity

## Purpose

ClawAI is production-grade and worked on by many people and many agents. The
scarcest resource is not code — it is **context**. Every change that leaves the
knowledge layer untouched makes the next change slower, and the cost compounds
silently until nobody, human or AI, can act without re-deriving what was already
known once.

So this rule is absolute: **a change is not the code alone. A change is the code
plus the knowledge that lets the next agent act on it in seconds.** Any feature,
flagship, fix, refactor, migration, enhancement, experiment or deletion —
literally anything — must leave `rules/`, `skills/`, `docs/`, `context/`,
`memory/` and `.ai/` measurably better than it found them.

The bar is not "documented." The bar is: **a competent agent that has never seen
this repo can open the knowledge layer, and within seconds know where to go, what
to do, how to fix it, how to improve it, and what will bite them** — for business
logic, product logic, business cases, technical decisions, library choices and
operational procedure alike.

This rule is tier 2. It is not a nice-to-have, it is not deferred to "a docs
pass later," and "the code is self-explanatory" is not an exemption — the code
explains _what_, never _why_, _when not to_, or _what breaks next door_.

## Applies to

Every workspace and every change: all `apps/claw-*` services, `apps/claw-frontend`,
every `packages/shared-*`, `infra/`, `docker/`, `scripts/`, `tools/`, and the
governance tree itself (`rules/`, `skills/`, `context/`, `memory/`, `docs/`, `.ai/`).

## Mandatory rules

1. **Every change carries its knowledge delta.** In the same commit — never a
   follow-up — update whichever of these the change touches: the owning service's
   `CLAUDE.md`, its `docs/04-backend/service-guide-<name>.md`, the governing
   `rules/*.md`, the matching `skills/*.md` runbook, the relevant `context/*.md`
   map, and the generated `.ai/**` layer.
2. **New capability ⇒ new or extended skill.** If the change introduces a
   procedure someone will repeat — adding a gateway, a connector, a migration, an
   event, a permission, a locale key — there must be a `skills/*.md` runbook that
   makes the second person's attempt mechanical. Extend an existing skill when one
   fits; create one when none does. Creating skills is the default, not the exception.
3. **New constraint ⇒ new or extended rule.** If the change establishes something
   future contributors must not break, it becomes a numbered rule with an
   enforcement mechanism — not a comment, not a PR remark, not tribal memory.
4. **Every rule and skill is reachable from its index.** A file nobody can find
   is a file that does not exist. New `rules/*.md` are listed in
   [`rules/README.md`](README.md) or [`00-master-rules.md`](00-master-rules.md);
   new `skills/*.md` are listed in [`skills/00-index.md`](../skills/00-index.md).
5. **Document the _why_ and the _when not to_.** Record the decision, the
   alternatives rejected, and the conditions that would reverse it. A fact without
   its reason cannot be safely changed later. Non-obvious cross-cutting decisions
   become an ADR under [`docs/13-adr/`](../docs/13-adr/).
6. **Operational consequences are written down, not remembered.** When a change
   alters how the system must be _operated_, the procedure ships with it. In
   particular: a Prisma schema or generated-client change means the service's
   container is **stopped, removed, its image removed, and rebuilt** — never
   restarted in place, because a dev container's `dist/generated/prisma` is copied,
   not compiled, and a stale copy surfaces as `z.nativeEnum(undefined)` at boot.
   Independent services rebuild in parallel; dependents wait. Code-only changes
   take a `docker restart`. See [`skills/06-docker-toolkit.md`](../skills/06-docker-toolkit.md).
7. **Business and product knowledge is first-class.** Pricing, entitlement,
   quota, refund and plan semantics belong in `docs/` next to the technical
   contract, in the language of the business case — not inferred from a repository
   method. An agent must be able to answer "what is the product supposed to do
   here?" without reading the implementation.
8. **Library and dependency choices are justified in writing.** When a wrapper,
   adapter or dependency is introduced or swapped, record what it replaced, why,
   and what its failure modes are, per
   [`rules/13-external-library-wrappers-and-adapters.md`](13-external-library-wrappers-and-adapters.md).
9. **Record what surprised you.** Anything that cost real debugging time — a
   platform difference, a silent failure, an ordering trap — goes into the
   knowledge layer as a pitfall the moment it is understood. The second person to
   hit it must pay nothing.
10. **Generated artifacts are regenerated, never hand-edited.** After touching
    the tree, `npm run knowledge:build` and `npm run audit`; `npm run knowledge:verify`
    must pass. See [`24-generated-files-and-knowledge-freshness.md`](24-generated-files-and-knowledge-freshness.md).

## Prohibited patterns

- Shipping a feature, flagship or migration with **zero** diff under `rules/`,
  `skills/`, `docs/`, `context/` or `.ai/`.
- "I'll document it in a follow-up." The follow-up does not happen; the context
  dies with the session.
- A new `rules/*.md` or `skills/*.md` that no index references.
- A new service, module or public endpoint with no `CLAUDE.md` and no service guide.
- Recording _what_ the code does while omitting _why_ it does it and _when not to_.
- Hand-editing anything under `.ai/**` or the inventory snapshot.
- Deleting or superseding behavior while leaving the docs describing it in place —
  stale documentation is worse than none, because it is trusted.
- Treating this rule as satisfied by a commit message. Commit messages are not
  discoverable knowledge; the next agent reads the tree, not the reflog.

## Correct pattern

```bash
# 1. Resolve context BEFORE coding — this already tells you which knowledge
#    files govern the work, so it also tells you which ones you must update.
npm run knowledge:context -- --task="add criticModel to compare DTO"

# 2. Implement, and in the SAME commit carry the knowledge delta:
#    apps/claw-chat-service/CLAUDE.md          — the service-local constraint
#    docs/04-backend/service-guide-chat.md     — the behavior and its why
#    skills/create-dto.md                      — if the procedure generalises
#    rules/11-dtos-and-validation.md           — if it establishes a constraint

# 3. Regenerate the machine-readable layer and prove it is consistent.
npm run knowledge:build && npm run audit && npm run knowledge:verify

# 4. Gate only the folders you touched, then commit once and push.
cd apps/claw-chat-service
npx tsgo --noEmit && npm run lint && npm test && npm run build
```

## Enforcement

- **Knowledge check** — `npm run knowledge:coverage` fails when a `rules/*.md` or
  `skills/*.md` file is unreachable from its index, or when a service is missing
  its `CLAUDE.md` or `docs/04-backend/service-guide-<name>.md`. It runs in CI and
  in the unit suite, **not** in the git hooks: hooks gate code and must stay
  fast, and a missing index row never breaks a build. Generated-layer staleness
  is separately caught by `npm run knowledge:verify`.
- **Unit test** — `tools/__tests__/knowledge-coverage.test.mjs` asserts the
  coverage invariants directly, so the check itself cannot silently rot.
- **CI job** — the `knowledge:coverage` step in
  `.github/workflows/ai-native-os.yml`, alongside knowledge freshness and the
  inventory audit.
- **Review checklist** — a reviewer rejects a substantive change whose diff
  touches no knowledge file and offers no reason why none was warranted.

## Related skills

- [grow-the-knowledge-layer](../skills/grow-the-knowledge-layer.md) — the runbook for this rule.
- [find-canonical-owner](../skills/find-canonical-owner.md) — which file owns a given fact.
- [resolve-task-context](../skills/resolve-task-context.md) — `knowledge:context` first.
- [06-docker-toolkit](../skills/06-docker-toolkit.md) — the rebuild-vs-restart procedure.

## Related context

- Root [`CLAUDE.md`](../CLAUDE.md) — the delivery checklist and the authority hierarchy.
- [`24-generated-files-and-knowledge-freshness.md`](24-generated-files-and-knowledge-freshness.md) — the generated layer.
- [`06-docs-rules.md`](06-docs-rules.md) — how a doc page is written.
- [`context/generated-file-map.md`](../context/generated-file-map.md) — what is generated from what.

## Definition of done

- [ ] The change's knowledge delta landed in the **same commit** as the code.
- [ ] Any repeatable new procedure has a skill; any new constraint has a rule.
- [ ] Every new `rules/*.md` / `skills/*.md` is reachable from its index.
- [ ] The _why_, the alternatives rejected, and the reversal conditions are recorded.
- [ ] Operational consequences (rebuild vs restart, ordering, parallelism) are written down.
- [ ] `npm run knowledge:build`, `npm run audit` and `npm run knowledge:verify` all pass.
- [ ] Nothing under `.ai/**` or the inventory snapshot was hand-edited.

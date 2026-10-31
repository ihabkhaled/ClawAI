# Akinator Plan - declare the knowledge delta before you earn the right to skip it

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: before implementing anything that touches more than one file or takes more than one step. Produces batches with blast radius and the knowledge delta declared up front per batch, so skipping documentation, skills, rules, context or memory becomes visible instead of silent.

The reason documentation does not get written is that nobody ever decided not to
write it. It just never became a line item. Akinator's fix is structural: **the
knowledge delta is named at plan time**, before any code exists, so omitting it
is a visible edit to the plan rather than an absence nobody notices.

## When to use

- Before implementing anything spanning more than one file or step.
- Before any refactor, migration, upgrade or deletion.
- When resuming work whose earlier plan no longer matches the tree.

## When NOT to use

- A single-file, single-step change whose knowledge delta is obvious and small -
  still state the delta in one line, but do not build a batch table for it.
- Pure investigation with no intended change. Use `akinator-audit` instead.

## Procedure

### 1. Inputs

Plan from the audit (`akinator-audit`) and the intake answers
(`akinator-intake`), not from the request text alone. If either is missing, get
it first - planning on an unaudited claim is how a plan gets thrown away.

### 2. Cut the work into batches

A **batch** is the largest unit that can be verified once and landed coherently.
Not the smallest - the largest. Gate economy (`akinator-gate-economy`) depends on
batches being big enough that a single gate run covers real work.

Cut on these seams, in order of preference:

1. **Independently verifiable outcome** - the batch produces something you can
   prove works on its own.
2. **Blast radius boundary** - a batch that touches the auth path does not also
   touch the billing path.
3. **Ordering constraint** - something that must land before the next thing can
   compile, migrate or deploy.

Do not cut on "one commit per file" or "one batch per hour". Those are not seams.

### 3. Blast radius per batch

For each batch, name:

- **Files and modules touched** - the actual paths.
- **Callers affected** - who breaks if the contract changes.
- **Data touched** - schemas, migrations, anything with a backfill.
- **Contracts touched** - public APIs, events, permissions, money semantics.
- **Operational consequence** - does this change how the system is deployed,
  migrated, restarted or recovered? If yes, the batch owns a runbook delta.

### 4. Declare the knowledge delta - the step that makes this station matter

Every batch declares, **by path**, the knowledge artifacts it will create or
change:

```
Batch 2 - quota enforcement on refund
  Code:      src/billing/refund.ts, src/quota/apply.ts
  Docs:      <repo>/docs/business/quotas.md (new section: refund behavior)
             <repo>/docs/product/refunds.md (edge-case decision log entry)
  Rules:     <repo>/rules/07-quota-mutations.md (new - quota may only change via applyQuota)
  Skills:    (none - no repeatable procedure introduced)
  Context:   <repo>/context/entitlements.md (regenerate - new quota source)
  Memory:    memory/2026-08-26-refund-quota-decision.md
  ADR:       <repo>/docs/13-adr/adr-0012-refund-restores-quota.md
  Routers:   CLAUDE.md, AGENTS.md, CODEX.md (link the new rule)
  Why no X:  no ops consequence - no migration, no restart ordering change
```

Rules for the declaration:

- **Name paths, not intentions.** "Update the docs" is not a delta. A path is.
- **Empty categories are stated, with the reason.** `Skills: (none - no
repeatable procedure introduced)` is a valid line. A missing line is not.
- **A batch with a fully empty delta must justify it explicitly**, in the plan
  and again in the commit message. This is rare and it is legitimate - a typo fix
  in a comment has no delta. Silence is what is prohibited, not emptiness.
- **Deletion batches always have a delta.** Removing behavior removes or updates
  every doc that described it.

### 5. Order the batches

Sequence by hard dependency only. Anything with no dependency between it and its
neighbor is unordered, and should be stated as unordered so it can be reordered
freely when reality intervenes.

Call out explicitly:

- What must land before what, and why.
- What can be done in parallel - and, for operational work, what **must not** be
  (see `akinator-ops-map` for restart and rebuild ordering).

### 6. Name the gate, once

State the single scoped gate that will prove the whole plan: which workspaces,
which commands. Not one per batch - one at the end, scoped to what was actually
touched. See `akinator-gate-economy`.

### 7. State assumptions

Anything you decided rather than asked goes in an explicit **Assumptions**
section, each with what would invalidate it. These become memory entries at
station 10 if they hold.

## Failure modes and pitfalls

- **Batches too small.** Twenty batches means twenty gate temptations and a plan
  nobody reads. Cut on seams, not on size.
- **A knowledge delta written as a category rather than a path.** "Docs: yes" is
  a checkbox, not a plan. See `akinator-anti-gaming`.
- **Planning past an unresolved business void.** If a batch cannot be planned
  without deciding a product question no doc answers, stop and run
  `akinator-intake`. Do not plan both branches and pick later - that doubles the
  work and decides nothing.
- **Ordering everything.** Over-sequencing a plan makes it brittle; the first
  surprise invalidates the whole chain. Order only real dependencies.
- **Planning the gate per batch.** That is the gate storm, pre-authorized.

## Definition of done

- [ ] The plan came from an audit and intake answers, not the request text alone.
- [ ] Work is cut into the largest coherently verifiable batches.
- [ ] Every batch names its blast radius: files, callers, data, contracts, ops.
- [ ] Every batch declares its knowledge delta **by path**, with empty categories
      explicitly stated and justified.
- [ ] Batch ordering reflects real dependencies only, and parallel-safe work is
      marked parallel-safe.
- [ ] A single scoped gate is named for the end of the work.
- [ ] Assumptions are listed with their invalidation conditions.

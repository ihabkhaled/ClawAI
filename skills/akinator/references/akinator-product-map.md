# Akinator Product Map - feature intent outlives the ticket

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: building, changing or removing a user-facing feature. Captures the feature's intent, its users, its acceptance criteria, its edge-case decision log, its non-goals and its open questions, so the reason a feature behaves the way it does survives the ticket that created it.

Tickets rot. They are written to justify starting work, closed the moment the
work is merged, and archived in a system the next agent may not even have access
to. The decisions inside them - the twelve small edge-case calls that shaped the
feature - evaporate with them.

The result is the most demoralizing question in software: _"Is this a bug or is
it on purpose?"_ A product doc answers it in one line.

## When to use

- A user-facing feature is added, changed or removed.
- An edge case is decided during implementation ("what happens if they submit
  twice?", "what does an empty state show?", "can they undo it?").
- A behavior that looks like a bug is actually intended.
- A feature is deliberately scoped down - the non-goals are as valuable as the
  goals.

## When NOT to use

- For money and entitlement semantics - `akinator-business-map`.
- For implementation architecture - `docs/` and `akinator-adr`.
- For internal-only mechanics with no user-visible behavior.

## Procedure

### 1. One doc per feature, in the repo

Not per ticket, not per sprint. A feature accumulates decisions over years and
they belong in one place. Use the repo's conventions, or Akinator's
product-feature template.

If a doc for this feature exists, **extend it**. A second doc for the same
feature splits the decision log, which is the part that matters most.

### 2. Write the six sections

**Intent** - what the feature is for, in the user's terms. What can they do now
that they could not before, and why does that matter to them? Not "adds a bulk
export endpoint" but "lets an admin get their whole workspace's data out without
asking support, because enterprise procurement requires an exit path".

**Users** - who this is for, and who it is explicitly not for. Roles, plan tiers,
personas. This section prevents the slow generalization of a feature built for
one audience.

**Acceptance criteria** - the checkable conditions that define working. Written
so someone could verify them without reading code. These become the tests; where
the repo supports it, link the tests.

**Edge-case decision log** - the heart of the document. An append-only table:

| Date       | Situation                                     | Decision                                                      | Why                                                                |
| ---------- | --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| 2026-08-26 | User submits the export twice within a minute | Second request returns the first job, does not queue a second | Exports are expensive and idempotent from the user's point of view |

Every entry is dated absolutely and never edited away - a superseded decision gets
a new row that references the old one. The log is the answer to "is this a bug or
on purpose?", and it only works if it is complete.

**Non-goals** - what this feature deliberately does not do, and why. Non-goals
stop the recurring proposal to add the thing that was already considered and
rejected. Each non-goal states whether it is "never" or "not yet".

**Open questions** - undecided product questions, dated, with what each one
blocks. Explicitly listed, never implied by absence.

### 3. Decide edge cases with the owner, not around them

When implementation surfaces an undecided product question, that is an intake
trigger (`akinator-intake`), not a judgment call - if the answer would be visible
to a user or would be hard to reverse. Ask, then log the answer.

For genuinely small, reversible calls a careful colleague would make alone: make
it, log it in the decision log with its why, and move on. The log is what makes
that safe.

### 4. Handle removal

When a feature is removed, the doc is not deleted - it is marked removed, with
the date and the reason, and its decision log is preserved. The next time someone
proposes it, the history is there. Any doc, router or index that pointed at it as
live is corrected in the same batch (`akinator-document-change`).

### 5. Index and sync

Reachable from the docs index and reflected in the routers.

## Failure modes and pitfalls

- **Restating the UI.** A walkthrough of the screens is not intent, and it goes
  stale the moment the UI changes.
- **An empty decision log.** Every non-trivial feature generated edge-case calls
  during implementation. An empty log means they were made and not recorded.
- **Editing old decisions in place.** The history is the value. Supersede with a
  new dated row.
- **Missing non-goals.** Without them, the same rejected idea returns every
  quarter and gets re-litigated from scratch.
- **Open questions left implicit.** If it is undecided, say so, with the date.
- **A doc per ticket.** Splits the log, and the log is the point.
- **Writing it after the feature ships.** The edge-case decisions are only
  legible while you are making them.

## Definition of done

- [ ] One doc per feature; an existing one was extended rather than duplicated.
- [ ] Intent is written in the user's terms, not the implementation's.
- [ ] Users and non-users are both named.
- [ ] Acceptance criteria are checkable without reading code.
- [ ] Every edge case decided during this work is in the decision log, dated,
      with its why.
- [ ] Non-goals are listed, each marked never or not-yet.
- [ ] Open questions are listed with dates and what they block.
- [ ] The doc is reachable from an index and reflected in the routers.

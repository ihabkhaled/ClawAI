# Akinator ADR - decision records

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: a decision was made between real alternatives that will be questioned later - a library or vendor choice, an architectural boundary, a data model, a protocol, a build-versus-buy call, a deliberate tradeoff. Records context, the options considered, the decision, its consequences and when to revisit it.

Six months from now, someone will look at a choice you made and think it is
obviously wrong. They will be missing exactly one thing: what you knew at the
time and what you rejected. An ADR is that one thing.

The value of an ADR is almost entirely in the **rejected options**. A record that
says only what was chosen is a description; a record that says what was not
chosen, and why, is knowledge.

## When to use

- A library, framework, vendor or service was chosen over alternatives.
- An architectural boundary was drawn.
- A data model or schema shape was settled.
- A protocol, format or contract was fixed.
- Build versus buy.
- A deliberate tradeoff was accepted - performance for simplicity, consistency
  for availability, cost for latency.
- A deliberate deviation from a convention, a spec or a stated plan.
- Something was deliberately **not** done, and the temptation to do it will recur.

## When NOT to use

- A choice with no real alternative. Note the why in the relevant doc instead.
- A preference with no consequences - that is `memory/`.
- A constraint others must obey - that is a rule (though the rule may cite an ADR).
- A reversible detail nobody will question. ADRs for trivia devalue the ones that
  matter.

## Procedure

### 1. Check whether the decision is already recorded

Search `docs/13-adr/` (or the repo's equivalent). If an ADR covers this area, decide
whether you are **superseding** it. A superseded ADR is never deleted: it is
marked superseded with a link forward, because the history is the point.

### 2. Write the record

Use the repo's ADR conventions; otherwise Akinator's ADR template. Numbered
sequentially, never renumbered.

**Status** - `proposed`, `accepted`, `superseded by NNNN`, or `deprecated`.

**Date** - absolute.

**Context** - the forces at play. What problem, what constraints, what was true
about the system, the team, the timeline and the budget. Write this so it is
still legible when the constraints have changed: someone must be able to tell
whether your reasoning still applies.

**Options considered** - at least two, each with:

- What it is.
- What it would have cost.
- Why it was not chosen.

An ADR with one option is not a decision record. If there genuinely was only one
option, that is a fact about the constraints - write it in Context and note that
the decision was forced.

**Decision** - what was chosen, stated plainly and unconditionally.

**Consequences** - what this makes easy, what it makes hard, what it forecloses,
what debt it takes on. Include the bad ones; an ADR listing only benefits is
advocacy, not a record.

**Revisit when** - the concrete conditions under which this should be
reconsidered ("when we exceed 10k tenants", "when the vendor ships native
support", "when the second region is added"). This turns the ADR from a museum
piece into a live tripwire.

### 3. Link it both ways

- The ADR links to the code, rules and docs it governs.
- Those artifacts link back to the ADR. A rule that exists because of a decision
  cites the ADR in its Purpose section.

### 4. Index and sync

Reachable from the ADR index and reflected in the routers where it changes what
they say (`akinator-index-sync`, `akinator-router-sync`).

## Failure modes and pitfalls

- **The one-option ADR.** Records the outcome, loses the reasoning - which is the
  only durable part.
- **Consequences listing only upsides.** Every real decision costs something. If
  you cannot name the cost, you have not finished deciding.
- **Context written for today's reader.** Assume the reader knows nothing about
  the current moment. Name the constraints explicitly.
- **No revisit condition.** The ADR outlives its validity and starts misleading.
- **Renumbering or deleting superseded ADRs.** The chain is the value. Mark and
  link forward.
- **Writing the ADR after the fact from the diff.** The rejected options are not
  in the diff; they are only in your head, and only right now.
- **ADR inflation.** One per trivial choice makes the important ones
  unfindable.

## Definition of done

- [ ] The decision is not already recorded; if it supersedes one, that one is
      marked and linked forward.
- [ ] Status, absolute date, context, at least two options, decision,
      consequences and revisit-when are all present.
- [ ] Rejected options each state what they would have cost and why they lost.
- [ ] Consequences include the negative ones.
- [ ] The ADR links to the artifacts it governs, and they link back.
- [ ] It is reachable from the ADR index.

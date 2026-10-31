# Akinator Memoize - station 10

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: a session produces a durable fact worth carrying forward - a decision made without an ADR, an owner preference, a surprise, a dead end, a non-obvious constraint discovered the hard way. Writes it to persistent memory with its why, an absolute date and its reversal conditions, and prunes memories that have gone stale.

Memory is for the facts that would otherwise be rediscovered - usually
expensively, usually by someone who does not know they are rediscovering.

The distinguishing property of a memory entry is that it is **durable but not
structural**: it is not a rule (nobody is constrained by it), not a procedure
(there are no steps), not a map (it is not extractable), and not an ADR (there
were no real alternatives weighed). It is simply something true and worth
knowing.

## When to use

- A decision was made without weighing alternatives formally - it just needed a
  choice, and the choice should stick.
- The owner expressed a preference about how work should be done.
- Something surprised you: a library behaved unexpectedly, a config had a
  non-obvious effect, an obvious approach failed for a non-obvious reason.
- A dead end was explored. The next agent will consider it too; save them the trip.
- A constraint was discovered that is not written anywhere - a platform limit, a
  vendor quirk, an environment reality.

## When NOT to use

- For anything that constrains others - that is a rule.
- For anything with steps - that is a skill.
- For a decision with real alternatives and consequences - that is an ADR.
- For structural facts - those are context maps.
- For session-local state ("I am on batch 3"). Memory is durable, not a scratchpad.
- For anything the repo already records - the code, the git history, an existing
  doc. Duplicating those creates a second version that will disagree.

## Procedure

### 1. Check for an existing entry

Search memory for the same fact. If it exists, **update it** rather than adding a
second entry - two memories about one fact will diverge and the reader has no way
to know which is current. Updating means: correct the fact, keep the history line,
stamp the new date.

### 2. Write the entry

Use the repo's memory conventions; otherwise Akinator's memory template. Each entry
holds one fact and states:

- **The fact** - in one or two sentences, plainly.
- **Why** - why it is true, or why the decision was made. A fact without its why
  cannot be re-evaluated later; it just becomes cargo cult.
- **Date** - **absolute** (`2026-08-26`), never relative. "Last week" is
  meaningless to the reader six months out and actively misleading.
- **Reversal conditions** - what would make this no longer true, or no longer the
  right choice. This is what makes memory prunable instead of accumulative.
- **Links** - to the rules, skills, docs and code it relates to.

### 3. Classify it

Give the entry a type so recall can filter:

| Type         | Holds                                        |
| ------------ | -------------------------------------------- |
| `decision`   | A choice made and its why                    |
| `preference` | How the owner or team wants work done        |
| `surprise`   | Non-obvious behavior discovered the hard way |
| `dead-end`   | An approach tried and abandoned, and why     |
| `constraint` | An external reality that limits options      |

### 4. Prune

Memory that accumulates without pruning becomes a swamp, and a swamp gets
ignored. On each visit to this station, check the entries near the one you are
writing:

- **Reversal condition met?** Delete it, or rewrite it as history if the fact
  itself is still interesting.
- **Contradicted by the tree?** It is wrong. Wrong memory is worse than absent
  memory, because it is trusted. Delete or correct it now.
- **Superseded by a rule, ADR or doc?** Replace the entry with a link to the
  canonical home.
- **Duplicated?** Merge.

### 5. Index it

Every entry reachable from the memory index (`akinator-index-sync`).

## Failure modes and pitfalls

- **Relative dates.** "Recently", "last sprint", "currently" - all become lies.
  Absolute dates only.
- **A fact with no why.** Unre-evaluatable, so it survives long past its truth.
- **No reversal condition.** The entry can never be pruned, so memory grows until
  nobody reads it.
- **Memorizing what the repo already records.** If the code, git history or an
  existing doc holds it, do not copy it here.
- **Session state in durable memory.** Where you are in a task is not a memory.
- **Hoarding.** Twenty low-value entries drown the three that matter. If it would
  not change what a future agent does, do not write it.
- **Never pruning.** Pruning is part of this station, not a separate cleanup task
  that never gets scheduled.

## Definition of done

- [ ] The fact has exactly one entry; an existing one was updated rather than
      duplicated.
- [ ] The entry states the fact, the why, an absolute date, and reversal
      conditions.
- [ ] The entry is typed and linked to related artifacts.
- [ ] Neighboring entries were checked; stale, contradicted, superseded and
      duplicate ones were pruned or merged.
- [ ] The entry is reachable from the memory index.

# Akinator Skillify - station 7

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: a procedure was worked out during a task - a debugging path, a deployment sequence, a migration recipe, a setup dance, a diagnostic order. Turns it into an indexed skill the first time it happens, rather than the third time someone re-derives it.

The test is not "will this happen often". The test is **"will this happen
twice"** - and the answer is almost always yes, because a procedure that was
needed once was needed because of a property of the system, and the system is
still like that.

Write the skill the **first** time. Creating skills is the default, not the
exception.

Repetition is caught two ways: `python <upstream>/scripts/akinator_distil.py repeats
[--since 90.days] [--min 3]` lists co-changing file sets and repeated
commit-subject stems; and you notice the **second occurrence** yourself. Either
way, **ASK the owner**: skill, rule, or neither? Record the answer with
`akinator_distil.py decide <fingerprint> --as rule --note "..."` (`neither` is
valid and stops the re-ask).

## When to use

Something in this batch involved a sequence of steps that was not obvious, where
getting the order or the details wrong would cost time:

- A debugging path that found a non-obvious root cause.
- A deployment, migration, rebuild or restart sequence.
- A local setup dance with ordering or environment constraints.
- A diagnostic order ("check X before Y, because Y is misleading when X is bad").
- A recovery procedure.
- Anything you had to figure out by trial and error.

## When NOT to use

- A procedure fully covered by an existing skill - extend that one instead.
- A single command with no ordering, no preconditions and no failure modes. That
  is a line in a doc, not a skill.
- A one-time migration that can never recur - though the _decision_ behind it may
  still deserve an ADR.

## Procedure

### 1. Check for an existing home first

Search the repo's `skills/` for the same procedure under a different name. If a
skill covers 70% of this, extend it - a second near-duplicate skill is worse than
none, because the agent picks one at random and half the time it is the stale one.

### 2. Match the repo's conventions

Adopt, never impose. If the target repo already has a skills format, numbering or
index style, use it. Only if the repo has none do you use the Akinator template
(Akinator's skill template).

### 3. Write the skill

Every skill carries all six parts. A skill missing any of them fails review.

**Frontmatter** - `name` in kebab-case, `description` written as a **trigger**:
the situations in which this should fire, in the words someone would use when
they are in that situation. A description that describes the skill instead of its
trigger will never fire.

**When to use** - the concrete situations, including the symptoms as they present
themselves, not as they are understood afterwards.

**When NOT to use** - the neighboring situations this does not cover, and where
to go instead. This is what stops the skill from firing on the wrong problem.

**Procedure** - numbered, in order, with the actual commands. State explicitly:

- What must be true before starting (preconditions).
- What runs in parallel and what must be sequential, and why.
- What to check between steps to know a step worked.

**Failure modes and pitfalls** - what goes wrong, what it looks like when it goes
wrong, and what the misleading symptom is. This section is usually the reason the
skill is worth more than the docs.

**Definition of done** - the checkable conditions. Not "the deploy is done" but
the observable facts that prove it.

### 4. Index it

A skill nobody can find does not exist. Add it to the repo's skills index and to
whatever router links the index (`akinator-index-sync`,
`akinator-router-sync`).

### 5. Prove the trigger

Read your own `description` and ask: if an agent had this problem and did not
know the skill existed, would this description match what they are thinking? If
not, rewrite it in the language of the problem, not the language of the solution.

## Failure modes and pitfalls

- **The copy-paste skill.** Cloning an existing skill and renaming it produces
  something that looks like coverage and delivers none. This is a compliance
  failure, not a shortcut - see `akinator-anti-gaming`.
- **A description that describes rather than triggers.** "This skill handles
  database migrations" never fires. "Use when a schema change needs to reach a
  running environment, or when a migration failed halfway" fires.
- **Procedure without preconditions.** The step that fails is always the one that
  assumed something.
- **Omitting the parallel-versus-sequential call.** For anything operational this
  is the most expensive detail to get wrong, and the one most often left out.
- **No failure-modes section.** The procedure tells you what to do; the failure
  modes tell you what it looks like when the procedure was not enough.
- **Writing it "later".** Later is after the context is gone, and the skill will
  be written from memory and be subtly wrong.

## Definition of done

- [ ] No existing skill already covered this; if one nearly did, it was extended
      instead.
- [ ] The skill matches the repo's existing conventions.
- [ ] All six parts present: trigger frontmatter, when-to-use, when-NOT-to-use,
      procedure, failure modes, definition of done.
- [ ] The procedure names preconditions, real commands, and what is parallel
      versus sequential.
- [ ] The description is written in the language of the problem.
- [ ] The skill is reachable from the repo's skills index and its router.

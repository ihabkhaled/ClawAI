# Akinator Anti-Gaming - documents must be TRUE

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: reviewing whether documentation work is real, when a checklist is about to be ticked, when tempted to weaken a failing check, or when a batch's knowledge delta looks complete but thin. Catches fake compliance - vacuous docs, copy-paste skills, rules with no enforcement, claimed coverage - which is worse than absence because it is trusted.

The predictable failure mode of a documentation mandate is not refusal. It is
**fake compliance**: files that exist, checklists that are ticked, coverage that
is claimed, and none of it load-bearing.

This is worse than having nothing. Absence is honest - a reader knows to
investigate. A vacuous document is trusted, acted upon, and wrong.

## When to use

- Reviewing a batch's knowledge delta before calling it done.
- Before ticking any checklist item.
- When a check fails and there is a temptation to change the check.
- When documentation was produced quickly and reads smoothly - fluency is not
  evidence.
- When adversarially reviewing someone else's compliance claim, including your
  own from earlier in the session.

## When NOT to use

- As a reason to add bulk. The cure for a vacuous doc is a true one, not a longer
  one. Padding is the same failure with more words.

## Procedure

### The six gaming patterns, and how to catch each

**1. The vacuous doc.** Restates what the code plainly says, with no why and no
when-not-to.

> Test: delete every sentence that a reader could derive by reading the code. If
> nothing survives, the doc adds nothing. Rewrite it around the why, the rejected
> alternative, the when-not-to, and what would make it stale.

**2. The copy-paste skill.** A near-duplicate of an existing skill with names
changed - looks like coverage, delivers none, and creates two candidate skills
where the agent picks wrong half the time.

> Test: does its procedure contain steps and commands specific to _this_
> situation? Does its failure-modes section describe failures actually seen here?
> If not, delete it and extend the original.

**3. The unenforced rule.** A constraint written as prose, or naming an
enforcement mechanism that does not exist in the tree.

> Test: open the named mechanism. Does the file exist? Run it. Does it actually
> fail when the rule is violated? A rule whose check cannot fail is decoration.

**4. The ticked checklist.** Boxes marked done with no artifact behind them.

> Test: for every ticked box, name the artifact and open it. Verify it was
> changed in this batch, not merely present from before. A tick is a claim, and
> claims are verified, never trusted.

**5. Claimed coverage.** "All modules documented", "everything indexed".

> Test: sample. Pick three items at random from the claimed set and verify each
> against the tree. One failure invalidates the claim, and the claim's author
> should re-verify the whole set rather than fix the three.

**6. The weakened check.** A failing test deleted, an assertion loosened, a type
widened, a lint rule suppressed, a threshold lowered - to obtain green.

> **Never weaken a check to make it pass.** A red check is information. Fix the
> tree, or change the check deliberately and record why in an ADR. A check
> changed silently in the same batch as the code it was failing on is the single
> strongest signal of gaming, and should be treated as such.

### The general test: would this help the next agent?

For every artifact in the knowledge delta, ask: if a fresh agent with no context
read only this, would they act correctly and faster? If the honest answer is no,
the artifact is not done, no matter how complete it looks.

### Under pressure

Fake compliance appears most often at the end of long work, under time pressure,
when the code is finished and stations 6 through 11 feel like paperwork. That is
precisely when the discipline pays - a thin delta written at that moment is the
one the next agent will trust and be misled by.

If there is genuinely no time to do the knowledge delta properly, the correct
move is to **say so explicitly** - name what is missing and why - not to produce
a plausible-looking version of it. An honest gap is recoverable; a fake artifact
is not, because nobody knows to look at it again.

## Failure modes and pitfalls

- **Rationalizing.** "It's obvious", "the code is self-documenting", "I'll flesh
  it out later", "this is good enough for now" - each is the same decision.
- **Confusing fluency with substance.** Well-written vacuous prose is harder to
  catch, not better.
- **Padding to look thorough.** Length is not evidence.
- **Auditing others and not yourself.** Your own delta from three hours ago gets
  the same scrutiny.
- **Reporting a green run you did not observe.** Report outcomes faithfully - if
  tests failed, say so with the output; if a step was skipped, say that.

## Definition of done

- [ ] Every doc in the delta survives the delete-the-derivable test.
- [ ] Every skill has a procedure specific to its situation, with real failure
      modes.
- [ ] Every rule's enforcement mechanism exists and was run and observed.
- [ ] Every ticked box names an artifact that was changed in this batch.
- [ ] Coverage claims were sampled and verified, not asserted.
- [ ] No check was weakened, deleted, loosened or suppressed to obtain green.
- [ ] Any genuine gap is stated explicitly rather than papered over.

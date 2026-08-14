# 31 — Anti-Gaming and Semantic Compliance

## Purpose

[Rule 30](30-agent-self-regulation-and-loop-prevention.md) puts explicit
budgets on nesting, retries, verification, and review rounds. A budget stated
as a literal, syntactic rule can be technically satisfied while the exact
behavior it exists to prevent still happens underneath — a retry under a
renamed command, a sub-investigation relabeled to dodge a nesting count, a
`REQUIRED` item quietly marked `OPTIONAL` to skip it, a blocker declared to
escape a hard task. This rule defines equivalence by intent, not syntax, so
those loopholes close, and it defines the one legitimate way to exceed a
budget on purpose: an explicit, evidence-backed override, never a silent one.

## Applies to

Every agent (human or AI) on every task in this repository, alongside
[rules/30](30-agent-self-regulation-and-loop-prevention.md).

## Mandatory rules

1. **Semantic compliance over literal compliance.** Every budget and
   classification in rule 30 is enforced against its intent. An action that
   reproduces the exact behavior a rule exists to prevent is a violation even
   if it does not match the rule's literal wording.
2. **Strategy identity (anti strategy-laundering).** A retry's identity is its
   hypothesis, its expected evidence, its target failure, and its intended
   outcome — not its command text. `npm test auth` and `npx jest auth`
   retrying the same unfalsified hypothesis are the same attempt under
   [rule 30](30-agent-self-regulation-and-loop-prevention.md) rule 2's retry
   budget, regardless of which one is typed.
3. **Causal depth (anti hidden-recursion).** Nesting depth (rule 30 rule 1) is
   tracked by causal relationship to the Primary Objective, not by the label
   attached to a branch. Renaming a sub-investigation "research",
   "validation", or "review" does not reset its depth. Dispatching a subagent
   to perform a step that is causally the same investigation does not reset
   it either — a dispatched subagent inherits the parent branch's depth, it
   does not start a fresh count at zero.
4. **Scope-laundering guard.** Before reclassifying a discovery from
   `OPTIONAL`/`UNRELATED` to `REQUIRED` (rule 30 rule 4) to justify doing it
   anyway, answer explicitly: does the Primary Objective fail without this
   work? What repository evidence proves the dependency? What is the minimum
   necessary change? Absent a concrete answer to all three, the
   classification stays `OPTIONAL` and the work is parked, not done.
5. **False-progress guard.** Activity is not progress. Files read, tool calls
   made, tokens spent, plans written, docs produced, unchanged test reruns,
   files touched, commits created, and subagents spawned do not, by
   themselves, count as progress. Progress requires at least one of: a
   requirement completed, a blocker removed, an acceptance condition verified
   with evidence, a failing relevant test now passing, a deliverable
   completed, or a material reduction in uncertainty with a stated reason.
6. **False-completion guard.** `DONE` is asserted only with evidence for every
   mandatory Definition-of-Done condition
   ([rules/00-master-rules.md](00-master-rules.md)'s Non-Negotiable Mandate;
   [rule 26](26-prompt-pack-intake-protocol.md) step 4's per-deliverable
   audit). Compiling, one passing test, a working happy path, or "should
   work" are not evidence. Any unresolved `BLOCKER`/`REQUIRED` finding
   (rule 30 rule 4) makes `DONE` false regardless of how much other work is
   finished.
7. **False-blocker guard.** A blocker is real only when it names the exact
   blocking condition, the evidence for it, a bounded recovery attempt
   already made (rule 30 rule 2's retry budget, actually spent), why
   alternative strategies cannot currently proceed, and the exact missing
   dependency/input/capability. One failed attempt, unfamiliar code, a
   complicated area, a single failing test, ordinary uncertainty, a slow
   build, or a large file are never blockers on their own. Full checklist:
   [skills/blocker-validation.md](../skills/blocker-validation.md).
8. **Memory-integrity guard.** Before promoting a fact to durable memory
   (`memory/*.md`), verify its source, classify its confidence, and confirm
   it is stable rather than a temporary debugging artifact. A memory entry
   never overrides newer, directly-observed repository evidence — if a memory
   entry and the current code disagree, the code wins and the entry is
   superseded ([memory/README.md](../memory/README.md)'s existing supersede
   policy), never silently trusted over what is actually in front of you.
9. **Context-preservation guard.** When compressing context — rule 30's
   nesting/WIP discipline, or an ordinary long-conversation summary — never
   drop: the Primary Objective, explicit acceptance/failure criteria,
   security or architectural constraints, unresolved blockers, decisive
   evidence already gathered, or explicit user instructions. Compress
   redundancy and abandoned speculation; never required meaning.
10. **Executive override protocol.** A self-regulation limit in rule 30
    (nesting, retry, verification, critic-round, WIP) may be deliberately
    exceeded, but only with an explicit, stated override naming: the
    **Reason** the limit is blocking reliable completion, the **Evidence**
    that justifies going further, the exact **Scope** of the temporary
    change, and the **Exit condition** that restores the normal limit. A
    limit is never silently disabled and a retry/nesting counter is never
    silently reset — an override is written into the task's own plan or
    output, not hidden inside a fresh count.
11. **No selective rule shopping.** When two governing documents conflict,
    resolve strictly by the authority hierarchy already defined in
    `CLAUDE.md` / [rules/README.md](README.md) (root policy →
    non-negotiables → architecture map → numbered rules → skills →
    context/memory → generated manifests → compact routers). Never pick
    whichever applicable rule makes the current action easiest. Ambiguity
    that changes the deliverable is asked about
    ([rule 26](26-prompt-pack-intake-protocol.md) step 6), never resolved in
    whichever direction is convenient.

## Prohibited patterns

- Retrying the same hypothesis via a different command, or a freshly spawned
  subagent, to reset the attempt count.
- Relabeling a sub-investigation "research" or "validation" to stay under the
  nesting limit while its causal depth is unchanged.
- Marking `REQUIRED` work `OPTIONAL` to skip it, or marking `OPTIONAL` work
  `REQUIRED` just to justify doing it anyway.
- Declaring a blocker without a bounded recovery attempt and a named missing
  dependency.
- Claiming `DONE` on a green build with an unresolved `REQUIRED` finding still
  open.
- Storing a one-off debugging assumption as durable memory.
- Compressing a long context in a way that silently drops the original
  acceptance criteria.
- Silently widening a retry or critic budget instead of stating an explicit
  override.

## Correct pattern

```text
Reason: the third retry on the auth-token-refresh failure revealed a NEW
failure mode (a timeout became a validation mismatch) — rule 30 rule 2's
"new evidence" exception applies.
Evidence: attempt 3's stack trace shows a different exception class than
attempts 1-2.
Scope: one additional targeted attempt at the validation-mismatch hypothesis
only.
Exit condition: stop regardless of outcome after this attempt; escalate as a
blocker if it also fails.
```

## Enforcement

- **Review checklist** — self-enforced, plus the `code-review` skill; same
  model as [rules/25](25-exceptions-and-waivers.md) and
  [rules/30](30-agent-self-regulation-and-loop-prevention.md). No automated
  check is feasible for agent-behavior semantics like strategy identity or
  causal depth.
- Worked loophole scenarios and their expected detection:
  [context/agent-self-regulation-scenarios.md](../context/agent-self-regulation-scenarios.md).

## Related skills

- [blocker-validation](../skills/blocker-validation.md)
- [reasoning-balance](../skills/reasoning-balance.md)
- [deadlock-recovery](../skills/deadlock-recovery.md)
- [reuse-before-creating](../skills/reuse-before-creating.md)

## Related context

- [rules/30-agent-self-regulation-and-loop-prevention.md](30-agent-self-regulation-and-loop-prevention.md) —
  the budgets this rule protects from being gamed.
- [rules/32-underthinking-and-reasoning-balance.md](32-underthinking-and-reasoning-balance.md) —
  the opposite failure mode this rule's guards must not create.
- [rules/25-exceptions-and-waivers.md](25-exceptions-and-waivers.md) — the
  analogous discipline for code-level deviations; this rule is its
  agent-behavior counterpart.
- [memory/README.md](../memory/README.md) — the supersede policy rule 8
  relies on.
- [context/agent-self-regulation-scenarios.md](../context/agent-self-regulation-scenarios.md) —
  worked loophole → detection → recovery scenarios.

## Definition of done

- [ ] No retry, nesting, or critic-round count was reset by renaming,
      rephrasing, or re-delegating the same underlying action.
- [ ] No discovery was reclassified without answering the three
      scope-laundering questions.
- [ ] No `DONE` claim stands with an unresolved `REQUIRED`/`BLOCKER` finding.
- [ ] Every declared blocker passes the five-point check in
      [skills/blocker-validation.md](../skills/blocker-validation.md).
- [ ] Any exceeded budget carries an explicit Reason/Evidence/Scope/Exit
      override, not a silent reset.
- [ ] No promoted memory entry contradicts current, directly-observed
      repository evidence.

# 30 — Agent Self-Regulation and Loop Prevention

## Purpose

Distinguish activity from progress. An agent that reasons, reads files, runs
commands, or edits code is not necessarily moving the task toward completion —
and left unbounded, investigation nests forever, debugging retries the same
failed hypothesis, review cycles oscillate, and interesting-but-irrelevant
discoveries silently expand the diff. This rule puts explicit, cheap limits on
those failure modes so they get caught in the moment, not after the context is
gone.

This rule governs agent _behavior during a task_, not the code the task
produces — it complements, and does not replace, rules 01, 26, and 27.

## Applies to

Every agent (human or AI) on every task in this repository.

## Mandatory rules

1. **Nesting limit / rabbit-hole guard.** Cap active sub-investigations at 3
   levels deep from the task's stated Primary Objective
   ([rules/01-task-intake-and-planning.md](01-task-intake-and-planning.md)'s
   2-sentence brief). At depth 4, stop expanding: restate the objective,
   classify the branch (rule 4 below), and — if non-blocking — record it and
   return to the parent task. This bounds mindsets #4 (audit-first) and #26
   (extend-don't-parallelize) in
   [rules/27](27-engineering-mindsets.md); reading and auditing are bounded
   activities, not open-ended ones.
2. **Retry budget.** Cap retries of the _same_ root-cause hypothesis in a
   fix → verify → fail cycle at 3 attempts. Attempt 1: apply the obvious fix.
   Attempt 2: challenge the diagnosis and try a materially different fix.
   Attempt 3: root-cause with fresh evidence (read the actual stack trace, add
   a log line, bisect). A 4th attempt at the same hypothesis is prohibited —
   change abstraction level, isolate the failure, or escalate as a blocker.
   This governs agent debugging behavior; it is distinct from
   [rules/18-error-handling-and-reliability.md](18-error-handling-and-reliability.md)'s
   retry-with-backoff, which governs runtime code calling external systems.
3. **Verification budget.** Once a claim has sufficient evidence (a green
   gate, a passing targeted test, direct observation), treat it as verified.
   Do not re-run the same check again absent new code or a new requirement
   that invalidates the prior evidence. A verification step that produces no
   new information is not verification, it is reassurance-seeking.
4. **Discovery classification and follow-ups.** Classify every non-trivial
   thing noticed mid-task that is not the Primary Objective as `BLOCKER`,
   `REQUIRED`, `OPTIONAL`, or `UNRELATED` before acting on it. `BLOCKER` and
   `REQUIRED` may interrupt the current task. `OPTIONAL` and `UNRELATED` are
   recorded — in the feature's plan doc
   (`.claude/Integrations/<feature>__PLAN.md`), a PR follow-up note, or
   `docs/14-risk-debt/` if it will outlive the change — and deferred, never
   silently folded into the current diff. This is the same discipline as
   [rules/25-exceptions-and-waivers.md](25-exceptions-and-waivers.md) applied
   to scope drift instead of code suppressions.
5. **Critic/review round cap.** Cap fix → re-review cycles (human review, the
   `code-review` skill, or a subagent critic) at 3 rounds. A critic may block
   further rounds only for correctness, security, an explicit requirement
   violation, data loss, a breaking regression, or a failing required gate —
   never for style preference, speculative architecture, or an unrequested
   enhancement. Unresolved non-blocking findings after round 3 are recorded
   per rule 4, not fixed on a 4th round.
6. **Deadlock/livelock detection.** Recognize and interrupt both: reasoning
   that cannot converge (the same file or symbol reread repeatedly with no new
   information, oscillating between two designs without deciding) and
   activity that produces no outcome (edit → test → revert → edit → test →
   revert; fix → critic → fix → critic with no round resolving a blocking
   finding). Either condition triggers the recovery protocol in
   [skills/deadlock-recovery.md](../skills/deadlock-recovery.md).
7. **Work-in-progress limit.** Keep at most one active, unrelated branch of
   work at a time, consistent with
   [rules/07-commit-rules.md](07-commit-rules.md)'s "one commit, one push."
   Finish or explicitly park (rule 4) the current item before opening a new,
   unrelated one. This does not restrict genuinely independent subtasks
   dispatched to parallel agents — it restricts one agent silently
   interleaving unrelated work streams inside a single task.

## Prohibited patterns

- A 4th attempt at a debugging hypothesis that produced no new evidence on
  attempts 1–3.
- Re-running a gate that already passed, with no code change since, "to be
  sure."
- Fixing an `OPTIONAL` or `UNRELATED` discovery inline instead of recording it
  and returning to the Primary Objective.
- A 4th critic → fix round on a non-blocking finding.
- Redefining the Primary Objective mid-task because of an interesting
  discovery (e.g. "implement password reset" silently becoming "redesign the
  Redis abstraction").
- Expanding investigation past depth 3 without restating the objective and
  classifying the branch.

## Correct pattern

```text
Primary Objective: implement password reset.
Discovery: the Redis abstraction could be cleaner.
Classification: OPTIONAL.
Action: note in `.claude/Integrations/password-reset__PLAN.md` → Follow-ups;
continue password reset.
```

## Enforcement

- **Review checklist** — self-enforced at the point of noticing drift; a
  reviewer (human or the `code-review` skill) rejects a diff whose scope
  silently exceeds the Primary Objective stated in
  [rules/01-task-intake-and-planning.md](01-task-intake-and-planning.md)'s
  brief.
- No automated check is feasible for reasoning depth, retry count, or review
  rounds — these are agent-behavior signals, not code. This rule relies on the
  same self-enforcement model as
  [rules/25](25-exceptions-and-waivers.md)'s waiver process.

## Related skills

- [deadlock-recovery](../skills/deadlock-recovery.md) — the recovery runbook
  mandatory rule 6 triggers.
- [reuse-before-creating](../skills/reuse-before-creating.md),
  [resolve-task-context](../skills/resolve-task-context.md).

## Related context

- [rules/01-task-intake-and-planning.md](01-task-intake-and-planning.md) — the
  Primary Objective and Definition of Done this rule protects.
- [rules/26-prompt-pack-intake-protocol.md](26-prompt-pack-intake-protocol.md) —
  the intake-time version of discovery classification (its step 4 done /
  partial / missing audit).
- [rules/27-engineering-mindsets.md](27-engineering-mindsets.md) — mindsets 4
  (audit-first) and 26 (extend-don't-parallelize), which this rule bounds with
  explicit limits.
- [rules/25-exceptions-and-waivers.md](25-exceptions-and-waivers.md) — the
  analogous discipline for code-level deviations.
- [rules/31-anti-gaming-and-semantic-compliance.md](31-anti-gaming-and-semantic-compliance.md) —
  closes the loopholes for technically satisfying this rule's budgets while
  reproducing the behavior they exist to prevent.
- [rules/32-underthinking-and-reasoning-balance.md](32-underthinking-and-reasoning-balance.md) —
  the counterweight: the floor beneath which these budgets must not push
  reasoning.
- [context/agent-self-regulation-scenarios.md](../context/agent-self-regulation-scenarios.md) —
  worked scenarios for all three rules.

## Definition of done

- [ ] No investigation branch exceeded depth 3 without an explicit objective
      restatement and blocking / non-blocking classification.
- [ ] No debugging hypothesis was retried a 4th time without new evidence.
- [ ] Every mid-task discovery was classified (`BLOCKER` / `REQUIRED` /
      `OPTIONAL` / `UNRELATED`); non-blocking ones were recorded, not silently
      actioned.
- [ ] No critic/review cycle exceeded 3 rounds on non-blocking findings.
- [ ] The Primary Objective stated at task start is the one delivered — not
      silently redefined.

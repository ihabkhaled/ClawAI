---
name: reasoning-balance
summary: Decide whether to keep investigating or start executing — the operational check that keeps rule 30 (anti-overthinking) and rule 32 (anti-underthinking) from reading as contradictory.
task_keywords:
  [
    reasoning balance,
    stop thinking,
    start thinking,
    decision readiness,
    sufficient evidence,
    underthinking,
    overthinking,
    when to investigate,
    when to act,
    critical unknown,
  ]
applies_to: [all-workspaces, monorepo-root]
required_rules:
  [
    30-agent-self-regulation-and-loop-prevention,
    31-anti-gaming-and-semantic-compliance,
    32-underthinking-and-reasoning-balance,
  ]
required_context: [none]
affected_workspaces: [none-behavioral]
required_tests: [none-behavioral]
required_docs: [none]
validation_lane: 'n/a — behavioral decision procedure, not a code change'
---

## When to use

Before implementation on any non-trivial task, and any time
[rule 30](../rules/30-agent-self-regulation-and-loop-prevention.md)'s
rabbit-hole/retry signals and
[rule 32](../rules/32-underthinking-and-reasoning-balance.md)'s evidence-floor
signals seem to pull in opposite directions — "the budget says stop" versus
"the requirement says I don't know enough yet."

## When NOT to use

Trivial, self-evident changes (a typo fix, a one-line config value) — the
overhead of the check exceeds the task.

## Read first

- [rules/30-agent-self-regulation-and-loop-prevention.md](../rules/30-agent-self-regulation-and-loop-prevention.md)
- [rules/32-underthinking-and-reasoning-balance.md](../rules/32-underthinking-and-reasoning-balance.md)
- [rules/31-anti-gaming-and-semantic-compliance.md](../rules/31-anti-gaming-and-semantic-compliance.md)
  rule 10 (executive override protocol)

## Repository discovery steps

Not applicable — this is a decision procedure, not a code-discovery step.

## Decision procedure

1. **Do we know enough to act?** Run
   [rule 32](../rules/32-underthinking-and-reasoning-balance.md) rule 12's
   decision-readiness gate: state the decision, the minimum evidence
   required, the evidence actually available, and the critical unknowns
   remaining. If a critical unknown remains → investigate only that unknown,
   not the whole area.
2. **Is the evidence now sufficient?** If yes → execute. Do not keep
   investigating "just in case" — that is
   [rule 30](../rules/30-agent-self-regulation-and-loop-prevention.md)'s
   territory, not this one's.
3. **Are we repeating investigation without new value** (same file reread,
   same command rerun, no new evidence)? If yes → stop investigating; rule
   30's deadlock/livelock signal has fired. Go to
   [skills/deadlock-recovery.md](deadlock-recovery.md).
4. **Are we stopping despite missing critical evidence** for a mandatory
   Definition-of-Done condition? If yes → this is premature completion
   ([rule 32](../rules/32-underthinking-and-reasoning-balance.md) rules 5 and
   11); continue, scoped to exactly the missing evidence.
5. **If rule 30 says stop (budget exhausted) and rule 32 says continue
   (evidence missing) at the same time** → this is the balance invariant's
   named conflict case (rule 32 rule 13). Invoke the executive override
   protocol
   ([rules/31](../rules/31-anti-gaming-and-semantic-compliance.md) rule 10)
   explicitly — Reason, Evidence, Scope, Exit condition — rather than picking
   a side silently.

## Security considerations

None — this skill is behavioral. It does, however, route
security-sensitive uncertainty toward rule 32 rule 7's floor rather than
letting a budget cut it short.

## Failure modes

- Treating this checklist itself as a new investigation branch — running it
  repeatedly without ever reaching step 2's "execute."
- Using step 1 as a loophole to justify open-ended investigation ("more
  evidence is always theoretically possible" is not the same as "a critical
  unknown remains").
- Resolving step 5's conflict by silently picking the more convenient rule
  instead of stating an override (prohibited by
  [rules/31](../rules/31-anti-gaming-and-semantic-compliance.md) rule 11).

## Validation commands

None. The outcome is the next action actually taken: execute, investigate the
specific named unknown, or invoke the override protocol with its four fields
stated.

## Documentation updates

None, unless the decision produces a durable lesson worth a `memory/*.md`
entry (rare — most invocations are task-local).

## Definition of done

- A stated decision, its readiness gate (evidence required vs. available vs.
  unknown), and the action taken are traceable in the task's own plan or
  output.

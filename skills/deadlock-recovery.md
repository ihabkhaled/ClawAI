---
name: deadlock-recovery
summary: Emergency runbook for reasoning that cannot converge (deadlock) or activity that produces no outcome (livelock) — stop, restate the objective, discard speculative branches, resume the smallest deliverable.
task_keywords:
  [
    deadlock,
    livelock,
    stuck,
    rabbit hole,
    loop,
    retry loop,
    critic loop,
    revert loop,
    oscillating,
    no progress,
    recovery,
    return to objective,
  ]
applies_to: [all-workspaces, monorepo-root]
required_rules:
  [
    30-agent-self-regulation-and-loop-prevention,
    01-task-intake-and-planning,
    26-prompt-pack-intake-protocol,
  ]
required_context: [none]
affected_workspaces: [none-behavioral]
required_tests: [none-behavioral]
required_docs: [none]
validation_lane: 'n/a — behavioral recovery, not a code change'
---

## When to use

Trigger when any of
[rules/30](../rules/30-agent-self-regulation-and-loop-prevention.md)'s
deadlock/livelock signals fire: 3+ nested investigations with no new evidence,
the same file or symbol reread repeatedly without new information, the same
command run repeatedly with the same result, a fix reverted and reapplied more
than once, alternating between two approaches without deciding, a
critic/fix cycle past round 3 with no round resolving a blocking finding, or
several work cycles passing with no requirement completed.

## When NOT to use

- A single failed attempt — that is rule 30's normal retry budget (up to 3
  attempts on the same hypothesis), not a deadlock.
- Legitimate multi-step work producing steady, verifiable progress, even if
  slow.
- A plain bug with a clear repro — use `superpowers:systematic-debugging`
  first; reach for this skill only once that process itself starts looping.

## Read first

- [rules/30-agent-self-regulation-and-loop-prevention.md](../rules/30-agent-self-regulation-and-loop-prevention.md) —
  the rule this skill enforces.
- [rules/01-task-intake-and-planning.md](../rules/01-task-intake-and-planning.md) —
  where the Primary Objective and Definition of Done were stated.
- [rules/25-exceptions-and-waivers.md](../rules/25-exceptions-and-waivers.md) —
  how a frozen, deferred branch gets recorded if it outlives the task.

## Repository discovery steps

Not applicable — this is a reasoning/process recovery, not a code-discovery
step.

## Recovery steps

1. **Stop.** Do not start another sub-investigation or another retry of the
   same strategy.
2. **Freeze the current branch.** Note in one line what was in progress, so it
   can be recorded as a follow-up if it turns out non-blocking.
3. **Restate, from the original task — not from the last few minutes of
   work:**
   - Primary Objective (rules/01's 2-sentence brief)
   - Definition of Done
   - What is already complete
   - What remains
   - The actual current blocker, if any
4. **Classify the frozen branch** per
   [rules/30](../rules/30-agent-self-regulation-and-loop-prevention.md) rule 4
   (`BLOCKER` / `REQUIRED` / `OPTIONAL` / `UNRELATED`). If not `BLOCKER` or
   `REQUIRED`, record it (plan-doc follow-ups, or `docs/14-risk-debt/` if it
   will outlive this change) and drop it — do not keep carrying it forward
   "in mind" for later in the same task.
5. **Choose a materially different next action, not a repeat**: change
   abstraction level (read the actual error instead of re-reading the same
   file), isolate the failure to the smallest reproducible case, or escalate
   as a genuine blocker if truly stuck.
6. **Resume the smallest deliverable** that advances the Primary Objective,
   and re-enter the normal delivery-first loop: plan → confirm scope → test →
   implement → verify (mindset #1 in
   [rules/27](../rules/27-engineering-mindsets.md)).

## Security considerations

None — this skill is behavioral, not code-touching.

## Failure modes

- Treating the recovery protocol itself as another investigation (rereading
  this skill repeatedly instead of acting on step 6).
- Restating the objective in step 3 but then resuming the exact failed
  strategy anyway.
- Classifying a real blocker as `OPTIONAL` to avoid dealing with it.

## Validation commands

None. The signal that recovery worked is that the next concrete action
visibly advances the Primary Objective — the same test rules/30 applies before
every major action: does this advance the objective, a required condition, a
true blocker, or required verification? If not, defer it (rules/30 rule 4).

## Documentation updates

If the frozen branch is recorded as a follow-up that will outlive the change,
add it to `docs/14-risk-debt/` per
[rules/25](../rules/25-exceptions-and-waivers.md).

## Definition of done

- The reasoning branch that triggered recovery was frozen and classified, not
  abandoned silently or continued unchanged.
- The Primary Objective and Definition of Done were restated from the
  original task, not reconstructed from recent context alone.
- The next action taken is materially different from the one that caused the
  loop.

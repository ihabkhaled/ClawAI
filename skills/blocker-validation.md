---
name: blocker-validation
summary: Distinguish a real blocker from an excuse to stop — a blocker needs an exact condition, evidence, a bounded recovery attempt, and a named missing dependency. One failed attempt or unfamiliar code is not a blocker.
task_keywords:
  [
    blocker,
    blocked,
    stuck,
    escalate,
    dependency missing,
    false blocker,
    premature blocker,
    cannot proceed,
    stop and report,
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
validation_lane: 'n/a — behavioral checklist, not a code change'
---

## When to use

Before writing "Blocked: ..." in any status update, or before classifying a
discovery as `BLOCKER` under
[rules/30](../rules/30-agent-self-regulation-and-loop-prevention.md) rule 4.

## When NOT to use

N/A — this check is cheap enough to always run before declaring a blocker,
and skipping it is exactly the false-blocker pattern it exists to catch.

## Read first

- [rules/30-agent-self-regulation-and-loop-prevention.md](../rules/30-agent-self-regulation-and-loop-prevention.md)
  rule 2 (retry budget) and rule 4 (discovery classification)
- [rules/31-anti-gaming-and-semantic-compliance.md](../rules/31-anti-gaming-and-semantic-compliance.md)
  rule 7 (false-blocker guard)
- [rules/32-underthinking-and-reasoning-balance.md](../rules/32-underthinking-and-reasoning-balance.md)
  rule 9 (premature strategy-reset guard)

## Repository discovery steps

Not applicable — this is a validation checklist, not a code-discovery step.

## Validation checklist

A blocker is real only if all five are true:

1. **Exact blocking condition named** — not "this is complicated," the
   specific missing thing.
2. **Evidence** — the concrete observation (an error, a missing permission,
   an absent credential, an undocumented external dependency) that proves
   the condition.
3. **Bounded recovery already attempted** —
   [rule 30](../rules/30-agent-self-regulation-and-loop-prevention.md)'s
   retry budget (up to 3 attempts on the current hypothesis) was actually
   spent, not skipped.
4. **Alternative strategies considered and ruled out** — state why they
   don't currently work, not just that the first one didn't.
5. **Exact missing dependency/input/capability named** — the specific thing
   that would unblock it (a credential, a decision, an upstream fix, access
   to a system).

**Not blockers on their own:** one failed attempt, unfamiliar code, a
complicated architecture, a single failing test, ordinary uncertainty, a slow
build, a large file. These are exactly what
[rule 32](../rules/32-underthinking-and-reasoning-balance.md) rules 1–2's
investigation floor exists to resolve by reading further, not by escalating.

## Correct pattern

```text
Blocked: claw-payment-service webhook signature verification needs the
Stripe webhook signing secret, which is not present in .env or
.env.example, and no issuer/rotation doc exists in docs/07-integrations/.
Attempted: checked packages/shared-constants, grepped STRIPE_WEBHOOK, checked
docs/06-data/environment-variables.md — absent from all three.
Alternative (skip verification in dev) rejected: rules/08-security-rules.md
prohibits disabling signature verification.
Needs: the secret value, or an explicit decision to stub it behind a
documented feature flag.
```

## Security considerations

A blocker on a security-sensitive path (rule 32 rule 7) must never be
resolved by weakening the security control to "unblock" — the correct
resolution is to name the real missing input, per point 5 above, not to
route around the control.

## Failure modes

- Declaring a blocker after zero attempts.
- Declaring a blocker that is really "I don't understand this code yet" —
  investigate per rule 32 rules 1–2 instead of escalating.
- A blocker with no named missing input — nothing anyone could actually
  supply to unblock it, which means it isn't a blocker, it's a stall.

## Validation commands

None. The check is the five-point list itself; failing any point means the
report is not yet a blocker.

## Documentation updates

If the blocker will outlive the current task, record it in
`docs/14-risk-debt/` per [rules/25](../rules/25-exceptions-and-waivers.md).

## Definition of done

- Every declared blocker satisfies all five checklist points.
- Together with
  [rules/30](../rules/30-agent-self-regulation-and-loop-prevention.md)'s
  Definition of Done ("no debugging hypothesis was retried a 4th time") and
  [rules/32](../rules/32-underthinking-and-reasoning-balance.md)'s evidence
  floor, this is the substantive gate that keeps "blocked" from being an
  escape hatch.

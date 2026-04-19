---
id: rollout-planning
title: Rollout planning
category: architecture-planning
level: recommended
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Rollout planning

## Purpose

Feature rollout isn't "merge and pray". Large features need staging, feature flags, cron scheduling, and a rollback plan.

## When to use

- Medium and large features.
- Any feature touching many users or critical paths.

## Workflow

1. Decide rollout strategy: all-at-once / staged / feature-flagged / cron-gated.
2. Identify the smallest valuable slice that can ship first.
3. For cron jobs: pick an off-hours time (3 AM default), make the job idempotent.
4. For feature flags: default OFF in prod env, ON in dev.
5. Write the rollback plan — exact commits to revert, exact migrations to roll back (if reversible), messaging to users.
6. Plan monitoring during rollout — which logs/metrics to watch.

## Strict rules

- **MUST** have a rollback plan for every medium/large feature.
- **MUST** make cron jobs idempotent.
- **MUST** default new feature flags OFF in prod.

## Anti-patterns

- "Hope it works" — no monitoring, no rollback.
- Cron job that runs at peak user time.
- Feature flag that defaults ON in prod without testing.

## Validation checklist

- [ ] Rollout strategy chosen
- [ ] Rollback plan documented
- [ ] Monitoring signals identified
- [ ] Feature flags default OFF in prod (if used)
- [ ] Cron jobs idempotent

## Quality gate

| Check                     | Blocker?      | Evidence  |
| ------------------------- | ------------- | --------- |
| Rollback plan in plan doc | yes (medium+) | Plan file |

## Definition of done

1. Strategy documented.
2. Rollback plan documented.
3. Monitoring plan documented.

## References

- `devops/release-checklist.md`
- `devops/rollback-planning.md`

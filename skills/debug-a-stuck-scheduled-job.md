---
name: debug-a-stuck-scheduled-job
summary: Diagnose owner locks, crashed replicas, bounded batches, and retries for ClawAI scheduled jobs.
task_keywords:
  [
    stuck scheduled job,
    cron lock,
    redis lock,
    sweep failed,
    replica died,
    batch not complete,
    lock ttl,
  ]
applies_to: [backend, Redis, scheduled jobs, operations]
required_rules: [17-rabbitmq-events-and-jobs]
required_context: [architecture-map, environment-ownership-map]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [lock contention, owner mismatch, callback failure, idempotent replay]
required_docs: [docs/11-runbooks/runbook-failed-billing-sweep.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Debug a Stuck Scheduled Job

## When to use

Use when cron appears silent, a replica died mid-run, a bounded batch never
drains, or retry state stops advancing.

## When NOT to use

Do not delete locks as routine recovery, increase TTL to conceal an unbounded
job, or manually repeat a non-idempotent side effect.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md)
- [`../rules/17-rabbitmq-events-and-jobs.md`](../rules/17-rabbitmq-events-and-jobs.md)
- The domain runbook and job constants defining lock key, TTL, and batch size.

## Repository discovery steps

1. Find the `@Cron`/interval entry and its shared job runner.
2. Read the lock key/TTL/batch constants.
3. Identify the durable cursor/status/attempt fields that make resume possible.
4. Find completion, contention, remainder, and error logs by job name.

## Tests-first plan

Cover acquired and contended locks, atomic owner mismatch, callback throw,
release throw, crash-equivalent partial progress, and a second idempotent run.

## Implementation steps

1. Confirm the schedule is registered and the process is healthy.
2. Inspect Redis `EXISTS` and `TTL` without printing the owner token.
3. Inspect durable progress and dependency health.
4. Wait for a valid lease or stop all owners before removing a malformed
   no-expiry lock.
5. Restore dependencies and invoke the domain's owner-safe manual path, if one
   exists.
6. Confirm the remainder drains across bounded runs.

## Security considerations

Lock tokens, provider payloads, and row contents can contain sensitive context;
log only job name, counts, stable machine codes, and safe entity ids.

## Failure modes

- Unconditional `DEL` lets a former owner overlap a successor.
- No durable cursor makes crash recovery restart ambiguous work.
- A TTL below worst-case duration permits two healthy owners.
- A huge batch repeatedly expires before completion.

## Validation commands

```bash
cd apps/claw-<service>-service
npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

Document lock key, TTL budget, batch size, durable resume state, manual trigger,
and terminal retry recovery in the domain runbook.

## Definition of done

- Exactly one owner runs at a time.
- The job resumes after crash/expiry without duplicate effects.
- The batch and remainder are observable.
- No live lock was force-deleted.

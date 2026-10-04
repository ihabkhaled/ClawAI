---
name: run-threads-generation-queue
summary: Operate and diagnose the isolated ClawAI Threads generation queue and durable jobs.
task_keywords: [Threads generation, generation queue, thread job, private draft]
applies_to: [backend, RabbitMQ, PostgreSQL, Threads]
required_rules: [17-rabbitmq-events-and-jobs, 49-whole-qa-team]
required_context: [architecture-map, service-dependency-map, database-ownership-map]
affected_workspaces: [apps/claw-thread-generation-service]
required_tests: [enqueue persistence, confirmed dispatch, worker claim, cancellation, settlement]
required_docs: [../docs/04-backend/service-guide-thread-generation.md]
validation_lane: focused generation-service specs, changed-file lint, and service typecheck/build
---

# Skill: Run the Threads Generation Queue

## When to use

Use when deploying, diagnosing, or changing isolated Threads generation jobs.

## Read first

- [Service guide](../docs/04-backend/service-guide-thread-generation.md)
- [Threads architecture](../docs/03-architecture/clawai-threads-architecture.md)
- [RabbitMQ job rules](../rules/17-rabbitmq-events-and-jobs.md)
- [Database ownership](../context/database-ownership-map.md)

## Current flow

The service-token-protected internal enqueue route validates a user-selected
cap, persists a job in `claw_thread_generation`, then publishes
`THREAD_GENERATION_REQUESTED` to the dedicated `claw.threads.generation`
queue. Confirmed dispatch failures leave a recoverable queued row. The worker
claims queued jobs atomically, records research and role checkpoints, and closes
the Auth aggregate budget when the job ends. Cancellation is checked between
provider calls. Drafts stay private; there is not yet a result read or publication
approval endpoint.

## Deploy and inspect

1. Confirm `THREAD_GENERATION_DATABASE_URL`, Chat, Research, Routing, Auth,
   RabbitMQ, and service-token configuration is present in the deployment
   environment. Never print secret values.
2. Confirm the `pg-thread-generation` container and generation service health.
   A database failure makes health degraded.
3. Startup runs Prisma migrations before serving. On a migration failure, inspect
   the generation container logs and migration status; do not reset the database.
4. Inspect only queue depth, safe job IDs, status, attempt count, and stable
   failure codes. Do not log or copy prompts, transcript snapshots, evidence,
   model responses, or service tokens.

## Focused validation

```powershell
cd apps/claw-thread-generation-service
npx vitest run src/modules/generation src/modules/research src/modules/models src/modules/source-snapshots
npm run typecheck
npm run build
```

For a code change, lint only touched TypeScript paths using the repository ESLint
configuration. Do not run the full monorepo test or lint suite for this service.

## Known recovery limit

The current worker has durable checkpoints but does not yet have periodic lease
renewal, automatic stale-job recovery, or checkpoint-based resume. Do not mark a
stuck job successful or replay provider calls manually; preserve the job and
budget state for owner-safe recovery work in a later batch.

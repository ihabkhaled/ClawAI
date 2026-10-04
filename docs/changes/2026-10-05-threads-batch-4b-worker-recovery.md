# Change - Threads batch 4b: worker recovery and fairness

## Before

Batch 4a persisted jobs and checkpoints, but worker loss could strand a running
job. There was no lease renewal, bounded automatic recovery, cross-replica
concurrency cap, or resumable reuse of saved role outputs.

## Change

Added expiring worker leases and heartbeats, two database-backed worker slots,
three-attempt bounded retry with backoff, stale-worker recovery, FIFO dispatch of
ready jobs, hash-checked checkpoint reuse, and persisted idempotent Auth budget
closure. Recovery and lease-fencing behavior has focused repository, service,
pipeline, and research-client tests.

## Product and architecture decisions

- Existing plan entitlement and credit hold/finalize/release paths remain in use;
  user-selected spend caps remain required and no PAYG price was added.
- Jobs and drafts remain private until the later publication owner-approval
  batch. The worker service has no public result endpoint.
- Concurrency is limited to two jobs across replicas using database-owned slots.
- Production DB Compose changes remain manual per deployment policy. Production
  provisioning and migration are not claimed by this code batch.

## Knowledge delta

Changed implementation paths:

- `apps/claw-thread-generation-service/prisma/migrations/20261005120000_threads_generation_recovery/migration.sql`
- `apps/claw-thread-generation-service/prisma/schema.prisma`
- `apps/claw-thread-generation-service/src/common/enums/generation-budget-close-status.enum.ts`
- `apps/claw-thread-generation-service/src/common/enums/generation-job-attempt-outcome.enum.ts`
- `apps/claw-thread-generation-service/src/common/enums/generation-job-recovery-outcome.enum.ts`
- `apps/claw-thread-generation-service/src/modules/generation/constants/generation.constants.ts`
- `apps/claw-thread-generation-service/src/modules/generation/managers/__tests__/generation-pipeline.manager.spec.ts`
- `apps/claw-thread-generation-service/src/modules/generation/managers/generation-pipeline.manager.ts`
- `apps/claw-thread-generation-service/src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts`
- `apps/claw-thread-generation-service/src/modules/generation/repositories/generation-jobs.repository.ts`
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.service.spec.ts`
- `apps/claw-thread-generation-service/src/modules/generation/services/generation-jobs.service.ts`
- `apps/claw-thread-generation-service/src/modules/generation/services/thread-budget.client.ts`
- `apps/claw-thread-generation-service/src/modules/generation/types/generation-pipeline.types.ts`
- `apps/claw-thread-generation-service/src/modules/generation/utilities/thread-generation-lease-lost.error.ts`
- `apps/claw-thread-generation-service/src/modules/research/__tests__/research.client.spec.ts`
- `apps/claw-thread-generation-service/src/modules/research/research.client.ts`

- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `docs/03-architecture/clawai-threads-architecture.md`
- `docs/04-backend/service-guide-thread-generation.md`
- `wiki/Threads.md`
- `skills/run-threads-generation-queue.md`
- `docs/qa-evidence/2026-10-05-threads-generation-recovery.md`
- Generated `.ai/**`, workspace `AGENTS.md`, and
  `docs/features/ai-native-engineering-os/inventory.snapshot.json`

No new rule or skill was needed; the existing queue runbook and scoped-gate,
commit, and QA rules cover this work. No new reusable cross-product procedure or
separate invariant was introduced.

## Validation

- Four focused Vitest specs: 15 tests passed.
- Generation service typecheck passed.
- Generation service build passed.
- Prisma schema validation passed.
- Local PostgreSQL accepted the migration; Prisma migration resolution and
  `prisma migrate status` confirmed both migrations applied and schema current.
- Changed-file ESLint exited 0 with warnings only.
- Local database migration, API/browser integration, full QA lanes, generated
  knowledge gates, hooks, commit, push, CI, and deployment are pending and are
  recorded as such in the QA evidence.

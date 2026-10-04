# Change - Threads batch 4a: durable private generation pipeline

## Files

- `apps/claw-chat-service/src/modules/chat-messages/controllers/__tests__/chat-internal.controller.spec.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/dto/__tests__/internal-generate.dto.spec.ts` (A)
- `apps/claw-thread-generation-service/docker-entrypoint.dev.sh` (A)
- `apps/claw-thread-generation-service/prisma.config.ts` (A)
- `apps/claw-thread-generation-service/prisma/migrations/20261004120000_threads_generation_jobs/migration.sql` (A)
- `apps/claw-thread-generation-service/prisma/migrations/migration_lock.toml` (A)
- `apps/claw-thread-generation-service/prisma/schema.prisma` (A)
- `apps/claw-thread-generation-service/src/app/guards/service-token.guard.ts` (A)
- `apps/claw-thread-generation-service/src/app/pipes/zod-validation.pipe.ts` (A)
- `apps/claw-thread-generation-service/src/common/enums/generation-job-storage-result.enum.ts` (A)
- `apps/claw-thread-generation-service/src/infrastructure/database/prisma/prisma.module.ts` (A)
- `apps/claw-thread-generation-service/src/infrastructure/database/prisma/prisma.service.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/constants/generation.constants.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/controllers/generation-jobs-internal.controller.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/dto/enqueue-generation.dto.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/generation.module.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/managers/__tests__/generation-pipeline.manager.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/managers/generation-pipeline.manager.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/repositories/generation-jobs.repository.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.service.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/services/generation-jobs.service.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/services/thread-budget.client.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/types/author-consensus.types.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/types/context-fit.types.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/types/generation-job-storage.types.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/types/generation-pipeline.types.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/types/reviewer-role.enum.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/__tests__/author-consensus.utility.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/__tests__/context-fit.utility.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/author-consensus.utility.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/context-fit.utility.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/stable-json.utility.ts` (A)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/thread-generation-cancelled.error.ts` (A)
- `apps/claw-thread-generation-service/src/modules/models/__tests__/chat-model.client.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/models/chat-model.client.ts` (A)
- `apps/claw-thread-generation-service/src/modules/models/model-context.client.ts` (A)
- `apps/claw-thread-generation-service/src/modules/models/models.module.ts` (A)
- `apps/claw-thread-generation-service/src/modules/research/__tests__/research.client.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/research/research.client.ts` (A)
- `apps/claw-thread-generation-service/src/modules/research/research.module.ts` (A)
- `docs/qa-evidence/2026-10-04-threads-generation-pipeline.md` (A)
- `packages/shared-types/src/events/thread-generation-events.types.ts` (A)
- `skills/run-threads-generation-queue.md` (A)
- `.env.example` (M)
- `CLAUDE.md` (M)
- `apps/claw-chat-service/src/modules/chat-messages/__tests__/payg-credit-surfaces.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/controllers/chat-internal.controller.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/dto/internal-generate.dto.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts` (M)
- `apps/claw-frontend/src/constants/credit.constants.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/ar.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/de.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/en.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/es.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/fa.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/fr.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/hi.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/it.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/ja.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/pt.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/ru.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/th.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/zh.ts` (M)
- `apps/claw-frontend/src/types/i18n.types.ts` (M)
- `apps/claw-thread-generation-service/CLAUDE.md` (M)
- `apps/claw-thread-generation-service/Dockerfile` (M)
- `apps/claw-thread-generation-service/Dockerfile.dev` (M)
- `apps/claw-thread-generation-service/package.json` (M)
- `apps/claw-thread-generation-service/src/app/app.module.ts` (M)
- `apps/claw-thread-generation-service/src/app/config/__tests__/app.config.spec.ts` (M)
- `apps/claw-thread-generation-service/src/app/config/app.config.ts` (M)
- `apps/claw-thread-generation-service/src/modules/health/controllers/health.controller.ts` (M)
- `apps/claw-thread-generation-service/src/modules/health/services/__tests__/health.service.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/health/services/health.service.ts` (M)
- `apps/claw-thread-generation-service/src/modules/health/types/health.types.ts` (M)
- `apps/claw-thread-generation-service/src/modules/source-snapshots/__tests__/chat-snapshot.client.spec.ts` (M)
- `context/architecture-map.md` (M)
- `context/database-ownership-map.md` (M)
- `context/event-flow-map.md` (M)
- `context/port-and-service-map.md` (M)
- `context/service-catalog.md` (M)
- `context/service-dependency-map.md` (M)
- `context/workspace-map.md` (M)
- `docker/docker-compose.dev.databases.yml` (M)
- `docker/docker-compose.dev.services.yml` (M)
- `docker/docker-compose.prod.databases.yml` (M)
- `docker/docker-compose.prod.services.yml` (M)
- `docs/03-architecture/clawai-threads-architecture.md` (M)
- `docs/04-backend/service-guide-thread-generation.md` (M)
- `docs/04-backend/services-index.md` (M)
- `docs/06-data/environment-variables.md` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)
- `package-lock.json` (M)
- `packages/shared-types/src/enums/payg-surface.enum.ts` (M)
- `packages/shared-types/src/events/event-patterns.ts` (M)
- `packages/shared-types/src/events/index.ts` (M)
- `scripts/install.ps1` (M)
- `scripts/install.sh` (M)
- `skills/00-index.md` (M)
- `wiki/Threads.md` (M)

## Before

The foundation batch exposed only Threads service health. Generation state had no
owning database, queue consumer, research/review pipeline, or private draft
storage. Existing chat-service already owned provider billing and full model
generation; research-service owned research evidence.

## Change

Added the generation-owned PostgreSQL schema and migration, development and
production database/service wiring, installer password generation, internal
service-token enqueue/cancel routes, confirmed RabbitMQ dispatch, durable job
and attempt/checkpoint/communication/revision persistence, research and model
clients, exact-hash author consensus, Judge/Critic thresholds, bounded rounds,
cancellation checks, existing Auth budget closure, and the Threads PAYG surface
label in all supported locales. Fixed dev Prisma startup and Compose volume
placement found during live validation.

## Now

The worker can persist a private draft awaiting owner review. Local dev Compose
starts the service and its database; health reports database readiness. Both
missing and invalid service tokens receive HTTP 401. Publication retrieval and
owner approval are not wired in this batch. Automatic stale-job recovery,
checkpoint resume, fairness, and explicit cross-replica concurrency limits are
deferred to Batch 4b.

## Why

The product requires a service boundary between generation and publication,
private drafts until owner approval, existing plan/credit rules, and hard
spending caps. This batch establishes the durable private-generation boundary
without creating a new PAYG price or crossing service database ownership.

## Knowledge delta

- `docs/03-architecture/clawai-threads-architecture.md`
- `docs/04-backend/service-guide-thread-generation.md` (updated existing guide; no duplicate guide)
- `docs/04-backend/services-index.md`
- `docs/06-data/environment-variables.md`
- `context/architecture-map.md`, `context/database-ownership-map.md`, `context/event-flow-map.md`, `context/port-and-service-map.md`, `context/service-catalog.md`, `context/service-dependency-map.md`, `context/workspace-map.md`
- `CLAUDE.md`, `apps/claw-thread-generation-service/CLAUDE.md`
- `skills/run-threads-generation-queue.md`, `skills/00-index.md`, `wiki/Threads.md`
- generated `docs/wiki/index.md`
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `docs/qa-evidence/2026-10-04-threads-generation-pipeline.md`
- `.husky/pre-commit`, `rules/34-gate-economy-and-machine-resources.md`, `rules/48-lint-and-test-only-what-changed.md`, `skills/run-gates-once-and-land.md`, `tools/__tests__/gate-receipt.test.mjs` (exact-tree receipts now avoid duplicate affected typecheck while preserving hooks and cheap checks)
- `tools/__tests__/payg-surface-exhaustiveness.test.mjs` (tracks the real Threads billing call site)
- this change record

## Decisions and deviations

- Work stayed on `main` as requested; no worktree was created.
- Updated the existing canonical service guide instead of adding a duplicate.
- No `rules/61` was added because this batch did not add an architecture test enforcing such invariants.
- Git hook bypasses remain prohibited by repository policy; normal hooks and remote gates will be used.
- Added a receipt-gated pre-commit typecheck fast path. Six focused receipt tests pass; lint-staged and knowledge/inventory checks still run, and a changed tree falls back to affected typecheck.
- The first pre-push architecture run exposed missing shared-rabbitmq Docker builds and an unregistered Threads billing producer; both integration checks were corrected before retrying push.
- Release versions use the repository's `tools/release/version.mjs`, which synchronizes every workspace after each conventional commit; no root-only version bump was applied.

## Verification

- Generation service: focused Vitest 10 files / 24 tests, typecheck, build, Prisma validation, changed-file ESLint (exit 0, warnings only).
- Chat: typecheck, build, changed-file ESLint (exit 0, warnings only), 3 focused specs / 12 tests.
- Frontend: typecheck and billing locale-label spec, 78 assertions; expensive Next production build was skipped.
- Shared-types: typecheck passed. Host build and ESLint hit Node's 4 GB heap limit; the Docker image build compiled shared-types successfully.
- Dev/prod Compose configuration, PowerShell parser, and `bash -n` passed.
- Live dev service returned health HTTP 200 with database up. Missing/invalid service tokens returned HTTP 401; a valid token reached DTO validation and returned HTTP 400. Pino logged branch results.
- Akinator's sensitive scan reported repository baseline matches; staged-path comparison against `HEAD` found zero new fingerprints. Strict coverage reported 5,461 repository-wide findings (7 critical); unrelated baseline findings were left untouched.
- Full lane status and open gaps are recorded in `docs/qa-evidence/2026-10-04-threads-generation-pipeline.md`.

## When this is stale

Revisit when the queue changes, migration changes, model billing path or role
policy changes, public approval wiring lands, or Batch 4b adds recovery and
fairness. Batch 5 must update this record's pending publication handoff.

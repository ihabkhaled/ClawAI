# Change - Threads account deletion propagation

## Files

- `tools/__tests__/deploy-prod.test.mjs` (M) — use Git Bash on Windows and normalize Bash source line endings in shell-function tests.
- `apps/claw-auth-service/prisma/migrations/20261005180000_account_deletion_outbox/migration.sql` (A)
- `apps/claw-auth-service/src/modules/users/repositories/__tests__/user-deletion-outbox.repository.spec.ts` (A)
- `apps/claw-auth-service/src/modules/users/repositories/user-deletion-outbox.repository.ts` (A)
- `apps/claw-auth-service/src/modules/users/constants/user-deletion-outbox.constants.ts` (A)
- `apps/claw-auth-service/src/modules/users/services/__tests__/user-deletion-outbox.publisher.spec.ts` (A)
- `apps/claw-auth-service/src/modules/users/services/user-deletion-outbox.publisher.ts` (A)
- `apps/claw-thread-generation-service/prisma/migrations/20261005180000_threads_account_deletion/migration.sql` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/account-deletion.module.ts` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/consumers/__tests__/account-deletion.consumer.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/consumers/account-deletion.consumer.ts` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/repositories/__tests__/account-deletion.repository.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/repositories/account-deletion.repository.ts` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/schemas/user-deleted-event.schema.ts` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/services/__tests__/account-deletion.service.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/account-deletion/services/account-deletion.service.ts` (A)
- `apps/claw-threads-service/prisma/migrations/20261005180000_threads_account_deletion/migration.sql` (A)
- `apps/claw-threads-service/src/modules/account-deletion/account-deletion.module.ts` (A)
- `apps/claw-threads-service/src/modules/account-deletion/consumers/__tests__/account-deletion.consumer.spec.ts` (A)
- `apps/claw-threads-service/src/modules/account-deletion/consumers/account-deletion.consumer.ts` (A)
- `apps/claw-threads-service/src/modules/account-deletion/repositories/__tests__/account-deletion.repository.spec.ts` (A)
- `apps/claw-threads-service/src/modules/account-deletion/repositories/account-deletion.repository.ts` (A)
- `apps/claw-threads-service/src/modules/account-deletion/schemas/user-deleted-event.schema.ts` (A)
- `apps/claw-threads-service/src/modules/account-deletion/services/__tests__/account-deletion.service.spec.ts` (A)
- `apps/claw-threads-service/src/modules/account-deletion/services/account-deletion.service.ts` (A)
- `docs/13-adr/adr-160-threads-account-deletion-propagation.md` (A)
- `docs/qa-evidence/2026-10-05-threads-account-deletion.md` (A)
- `memory/2026-10-05-threads-account-deletion.md` (A)
- `rules/61-threads-account-deletion.md` (A)
- `skills/propagate-account-deletion.md` (A)
- `apps/claw-auth-service/prisma/schema.prisma` (M)
- `apps/claw-auth-service/src/modules/users/__tests__/users.service.spec.ts` (M)
- `apps/claw-auth-service/src/modules/users/services/users.service.ts` (M)
- `apps/claw-auth-service/src/modules/users/users.module.ts` (M)
- `apps/claw-thread-generation-service/prisma/schema.prisma` (M)
- `apps/claw-thread-generation-service/src/app/app.module.ts` (M)
- `apps/claw-thread-generation-service/src/common/enums/generation-job-storage-result.enum.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/repositories/generation-jobs.repository.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/services/generation-jobs.service.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/types/generation-job-storage.types.ts` (M)
- `apps/claw-threads-service/prisma/schema.prisma` (M)
- `apps/claw-threads-service/src/app/app.module.ts` (M)
- `apps/claw-threads-service/src/modules/publications/repositories/__tests__/publications.repository.spec.ts` (M)
- `apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts` (M)
- `context/service-dependency-map.md` (M)
- `docs/02-business-product/clawai-threads-product-spec.md` (M)
- `docs/03-architecture/clawai-threads-architecture.md` (M)
- `docs/13-adr/adr-index.md` (M)
- `docs/qa-evidence/2026-10-05-threads-community-contributions.md` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)
- `packages/shared-types/src/events/event-patterns.ts` (M)
- `packages/shared-types/src/events/event-payloads.type.ts` (M)
- `packages/shared-types/src/events/index.ts` (M)
- `rules/README.md` (M)
- `skills/README.md` (M)
- `wiki/Threads.md` (M)
- `wiki/Flagship-Features.md` (M)
- `wiki/Home.md` (M)
- `wiki/_Sidebar.md` (M)

## Before

Auth deleted accounts without durable cross-service propagation. A failed or delayed event could leave Threads data linked to a deleted account.

## Change

Added Auth's transactional outbox and typed RabbitMQ event, idempotent Threads and Generation consumers, hashed tombstones, anonymous retention of eligible public work, private data cleanup, and enqueue guards. Fixed Windows deployment-test shell selection for Git Bash. Follow-up CI correction narrows the Auth service dependency to `Pick<UserDeletionOutboxRepository, 'deleteAccount'>` while injecting the repository class token explicitly.

## Now

Auth, Threads, Generation, and shared-types focused tests pass; touched workspaces typecheck/build; Prisma schemas validate; knowledge and inventory checks pass. The first GitHub CI run failed only Auth typecheck on the pre-fix test double cast. The follow-up correction passes local Auth typecheck, ESLint, and 69 focused tests; follow-up CI and deployment evidence remain pending.

## Why

Account deletion previously hard-deleted Auth data without durable cross-service propagation. The approved retention policy now has a recoverable, idempotent implementation and explicit repository guidance. The normal `feat` release workflow will set version 1.188.0 after this push; no premature manifest bump is included.

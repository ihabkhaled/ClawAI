# Change - Threads batch 5a: publication persistence and approval boundary

## Before

The Threads service was health-only. It had no owned database, migration, or
owner approval transition. Generation drafts remained private in the worker's
database.

## Change

- Added a separate `claw_threads` PostgreSQL database in dev/prod Compose and
  generated installer configuration with a distinct password.
- Added Prisma publication/revision tables and migrations to the Threads service.
- Added an authenticated owner approval endpoint. The repository checks owner
  and review-ready state, then changes publication and revision state in one
  database transaction. The returned DTO contains only publication-safe fields.
- Threads health now checks its owned database connection.
- The production image applies Prisma migrations as the non-root runtime user;
  Prisma engine files are owned by that user.
- Generation-result handoff, public reads, and publication safety scanning are
  not implemented; this batch does not enable publication launch.

## Knowledge delta

Changed paths include `docs/02-business-product/clawai-threads-product-spec.md`,
`docs/03-architecture/clawai-threads-architecture.md`,
`docs/04-backend/service-guide-threads.md`, `docs/wiki/security/sensitive-data.md`,
`context/database-ownership-map.md`, `wiki/Threads.md`, the implementation plan, and this change record. QA evidence
is recorded in `docs/qa-evidence/2026-10-05-threads-publication-persistence.md`.

No new rule or skill was added: existing service, Prisma, and QA procedures
cover this operation. Generated `.ai/**`, workspace `AGENTS.md`, and the
inventory snapshot must be regenerated after formatting.

## Changed paths

- `apps/claw-threads-service/Dockerfile`
- `apps/claw-threads-service/Dockerfile.dev`
- `apps/claw-threads-service/docker-entrypoint.dev.sh`
- `apps/claw-threads-service/package.json`
- `apps/claw-threads-service/prisma.config.ts`
- `apps/claw-threads-service/prisma/migrations/20261005130000_threads_publications/migration.sql`
- `apps/claw-threads-service/prisma/migrations/migration_lock.toml`
- `apps/claw-threads-service/prisma/schema.prisma`
- `apps/claw-threads-service/src/app/app.module.ts`
- `apps/claw-threads-service/src/app/config/app.config.ts`
- `apps/claw-threads-service/src/app/config/__tests__/app.config.spec.ts`
- `apps/claw-threads-service/src/infrastructure/database/prisma/prisma.module.ts`
- `apps/claw-threads-service/src/infrastructure/database/prisma/prisma.service.ts`
- `apps/claw-threads-service/src/modules/health/controllers/health.controller.ts`
- `apps/claw-threads-service/src/modules/health/services/health.service.ts`
- `apps/claw-threads-service/src/modules/health/services/__tests__/health.service.spec.ts`
- `apps/claw-threads-service/src/modules/health/types/health.types.ts`
- `apps/claw-threads-service/src/modules/publications/controllers/publication-owner.controller.ts`
- `apps/claw-threads-service/src/modules/publications/publications.module.ts`
- `apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts`
- `apps/claw-threads-service/src/modules/publications/repositories/__tests__/publications.repository.spec.ts`
- `apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts`
- `apps/claw-threads-service/src/modules/publications/services/__tests__/publication-lifecycle.service.spec.ts`
- `apps/claw-threads-service/src/modules/publications/types/publication.types.ts`
- `.env.example`
- `docker/docker-compose.dev.databases.yml`
- `docker/docker-compose.dev.services.yml`
- `docker/docker-compose.prod.databases.yml`
- `docker/docker-compose.prod.services.yml`
- `scripts/claw.sh`
- `scripts/install.sh`
- `scripts/install.ps1`
- `package-lock.json`
- `README.md`
- `context/database-ownership-map.md`
- `docs/02-business-product/clawai-threads-product-spec.md`
- `docs/03-architecture/clawai-threads-architecture.md`
- `docs/04-backend/service-guide-threads.md`
- `docs/06-data/environment-variables.md`
- `docs/wiki/security/sensitive-data.md`
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `docs/qa-evidence/2026-10-05-threads-publication-persistence.md`
- `wiki/Threads.md`
- `docs/changes/2026-10-05-threads-batch-5a-publication-persistence.md`
- Generated `.ai/**`, workspace `AGENTS.md`, and `docs/features/ai-native-engineering-os/inventory.snapshot.json`.

## Validation

- Prisma schema validation passed.
- Four focused service specs passed (10 tests).
- Threads service typecheck/build and changed-file lint passed.
- Dev and production Docker images built; the production image reported no
  pending migrations against the local Threads database.
- Whole-repository `akinator_coverage.py . --strict` remains red on 5,562
  existing governance/documentation findings; no unrelated mass cleanup was
  included in this implementation batch.
- Local `pg-threads` reports healthy and `pg_isready` accepts connections.
- Local migration application and service rebuild passed. Threads DB/service
  and generation service are healthy; Nginx reload/config test passed and the
  publication route returned the expected unauthenticated 401. Generated
  knowledge checks passed. The authenticated owner flow, full QA lanes, hooks,
  commit/push, CI, and production rollout remain pending.

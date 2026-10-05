# Change - Threads community contributions and moderation

## Files

- `apps/claw-threads-service/prisma/migrations/20261005170000_threads_community/migration.sql` (A)
- `apps/claw-threads-service/src/common/enums/publication-report-resolution.enum.ts` (A)
- `apps/claw-threads-service/src/modules/publications/controllers/__tests__/publication-community.controllers.spec.ts` (A)
- `apps/claw-threads-service/src/modules/publications/controllers/publication-community.controller.ts` (A)
- `apps/claw-threads-service/src/modules/publications/controllers/publication-moderation.controller.ts` (A)
- `apps/claw-threads-service/src/modules/publications/dto/__tests__/community-dtos.spec.ts` (A)
- `apps/claw-threads-service/src/modules/publications/dto/create-publication-change-request.dto.ts` (A)
- `apps/claw-threads-service/src/modules/publications/dto/create-publication-comment.dto.ts` (A)
- `apps/claw-threads-service/src/modules/publications/dto/create-publication-report.dto.ts` (A)
- `apps/claw-threads-service/src/modules/publications/dto/moderate-publication-report.dto.ts` (A)
- `apps/claw-threads-service/src/modules/publications/dto/resolve-publication-change-request.dto.ts` (A)
- `apps/claw-threads-service/src/modules/publications/dto/set-publication-reaction.dto.ts` (A)
- `apps/claw-threads-service/src/modules/publications/repositories/__tests__/publication-community.repository.spec.ts` (A)
- `apps/claw-threads-service/src/modules/publications/services/__tests__/publication-community.service.spec.ts` (A)
- `apps/claw-threads-service/src/modules/publications/services/__tests__/threads-generation.client.spec.ts` (M)
- `apps/claw-threads-service/src/modules/publications/services/publication-community.service.ts` (A)
- `apps/claw-threads-service/src/modules/publications/types/publication-community.types.ts` (A)
- `docs/changes/2026-10-05-threads-community-contributions-and-moderation.md` (A)
- `docs/qa-evidence/2026-10-05-threads-community-contributions.md` (A)
- `.ai/BOOTSTRAP.md` (M)
- `.ai/manifests/api-endpoints.json` (M)
- `.ai/manifests/data-ownership.json` (M)
- `.ai/manifests/hashes.json` (M)
- `.ai/manifests/prisma-models.json` (M)
- `.ai/manifests/services.json` (M)
- `.ai/manifests/tests.json` (M)
- `apps/claw-threads-service/AGENTS.md` (M)
- `apps/claw-threads-service/prisma/schema.prisma` (M)
- `apps/claw-threads-service/src/app/app.module.ts` (M)
- `apps/claw-threads-service/src/app/config/__tests__/app.config.spec.ts` (M)
- `apps/claw-threads-service/src/app/config/app.config.ts` (M)
- `apps/claw-threads-service/src/modules/publications/controllers/publication-owner.controller.ts` (M)
- `apps/claw-threads-service/src/modules/publications/publications.module.ts` (M)
- `apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts` (M)
- `context/permission-map.md` (M)
- `context/service-catalog.md` (M)
- `docs/02-business-product/clawai-threads-product-spec.md` (M)
- `docs/03-architecture/clawai-threads-architecture.md` (M)
- `docs/04-backend/service-guide-threads.md` (M)
- `docs/features/ai-native-engineering-os/inventory.snapshot.json` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)
- `docs/wiki/index.md` (M)
- `memory/2026-10-04-clawai-threads-product-decisions.md` (M)
- `wiki/Threads.md` (M)

## Before

Threads supported owner-managed publications and immutable revisions but had
no contribution or report endpoints. The accepted account-deletion policy had
no durable cross-service implementation.

## Change

Added authenticated comments, reactions, change requests, and reports with
moderator-only report resolution. Accepting a change request creates a fresh
capped revision through the existing review workflow. Added the community
tables/migration, service/controller/repository coverage, docs and QA record.

## Now

Community backend actions are available and gated by authentication, owner
checks, publication visibility, and moderator permission. Public comments omit
author IDs. Account deletion, community UI, internationalization and integrated
authenticated role verification remain unimplemented.

## Why

Ship the requested community controls in an independently reviewable backend
batch while keeping account erasure explicit: Auth lacks a durable deletion
event/outbox, so claiming anonymous retention now would be false.

## Business and product intent

Let authenticated readers contribute without requiring a generation plan. Keep
owner control over published content, require existing moderator permission for
report decisions, and do not create PAYG charges for community actions.

## Technical reasoning and trade-offs

Reuse the Threads publication database and existing immutable revision review
flow. Accepting a suggestion spends against a fresh user-selected cap and does
not publish automatically. Account deletion is deferred until Auth can signal
it durably across service boundaries.

## Compatibility and rollback

The migration is additive. Rollback requires disabling the new routes before
removing their tables; never drop community records while running a version that
still serves them. No public API previously existed for these actions.

## Verification

Six focused specs passed (30 tests); Threads typecheck, changed-file ESLint,
Prettier, build, Prisma schema validation and migration status passed. Local API
probes confirmed unauthenticated comment/moderation denial; QA evidence records
remaining role, e2e, UI and UAT gaps. Knowledge and inventory checks passed.

## Stale when

The contribution contract, moderation permission, retention/deletion design,
Threads database ownership, or generation revision review flow changes.

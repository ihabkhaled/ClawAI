# Change - Threads owner portal path trace

## Files

- `apps/claw-frontend/src/app/(portal)/threads/page.tsx` (A)
- `apps/claw-frontend/src/enums/thread-publication-status.enum.ts` (A)
- `apps/claw-frontend/src/hooks/threads/use-thread-publications.ts` (A)
- `apps/claw-frontend/src/repositories/threads/thread-publications.repository.ts` (A)
- `apps/claw-frontend/src/types/thread-publication.types.ts` (A)
- `apps/claw-threads-service/src/modules/publications/controllers/publication-list.controller.ts` (A)
- `docs/changes/2026-10-05-threads-owner-portal-foundation.md` (A)
- `docs/qa-evidence/2026-10-05-threads-owner-portal-foundation.md` (A)
- `.ai/BOOTSTRAP.md` (M)
- `.ai/manifests/api-endpoints.json` (M)
- `.ai/manifests/frontend-routes.json` (M)
- `.ai/manifests/hashes.json` (M)
- `.ai/manifests/i18n.json` (M)
- `.ai/manifests/services.json` (M)
- `CHANGELOG.md` (M)
- `apps/claw-frontend/src/constants/routes.constants.ts` (M)
- `apps/claw-frontend/src/constants/sidebar.constants.ts` (M)
- `apps/claw-threads-service/AGENTS.md` (M)
- `apps/claw-threads-service/src/modules/publications/publications.module.ts` (M)
- `apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts` (M)
- `apps/claw-threads-service/src/modules/publications/services/__tests__/publication-lifecycle.service.spec.ts` (M)
- `apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts` (M)
- `docs/features/ai-native-engineering-os/inventory.snapshot.json` (M)
- `package.json` (M)
- `package-lock.json` (M; restored to the release baseline rather than shipping redundant workspace-lock churn)
- `wiki/Threads.md` (M)

The first push attempt revealed that workspace manifests lagged the root version.
Release commit `8be788e59` synchronized `apps/*/package.json` and
`packages/*/package.json` to 1.188.3; the monorepo version test then passed.

The frontend portal adds `nav.threads` and a publication-load error message in
`apps/claw-frontend/src/lib/i18n/locales/*.ts` and their schema in
`apps/claw-frontend/src/types/i18n.types.ts` (13 locales, including RTL).

## Before

Threads had owner-specific operations but no owner publication list or portal page.

## Change

Added an authenticated capped owner list API and a portal page backed by a frontend repository and query hook. Updated wiki, changelog, generated knowledge, and QA evidence in the same batch.

## Now

Owners can view up to 50 newest publication summaries. Generation creation, review actions, community UI, full locale copy, and integrated browser QA remain open.

## Why

This creates a safe owner-scoped entry point for the remaining Batch 6 UI without exposing private snapshots or generation job identifiers.

## Validation

Focused lifecycle spec: 13 passed. Threads build and both workspace typechecks passed. Changed-file ESLint reported zero errors. Knowledge verify and inventory audit passed. See `docs/qa-evidence/2026-10-05-threads-owner-portal-foundation.md`; full UI QA remains open.

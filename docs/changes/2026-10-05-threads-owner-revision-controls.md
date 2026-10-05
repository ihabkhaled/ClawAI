# Threads owner revision controls

## Outcome

Extended the existing `/threads` owner portal with capped private revisions,
revision review status, Markdown/JSON export, and unpublish for live items. The
service already owns revision safety and review, export serialization, and
publication lifecycle rules; the frontend now calls those owner-scoped routes.
Edits stay private until fresh safety/model review succeeds and the owner uses
the existing approval action.

## Audited code paths

- `apps/claw-threads-service/src/modules/publications/controllers/publication-owner.controller.ts`
  already exposes revisions, revalidation state, export, and unpublish.
- `apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts`
  caps revision requests, runs safety and reviewer checks, and owner-scopes
  exports and unpublishing.
- `apps/claw-frontend/src/app/(portal)/threads/page.tsx` had creation and
  approval wired but no revision or publication management controls.

## Changed paths

- `apps/claw-frontend/src/app/(portal)/threads/page.tsx`
- `apps/claw-frontend/src/enums/index.ts`
- `apps/claw-frontend/src/enums/thread-publication-export-format.enum.ts`
- `apps/claw-frontend/src/lib/i18n/locales/ar.ts`
- `apps/claw-frontend/src/lib/i18n/locales/de.ts`
- `apps/claw-frontend/src/lib/i18n/locales/en.ts`
- `apps/claw-frontend/src/lib/i18n/locales/es.ts`
- `apps/claw-frontend/src/lib/i18n/locales/fa.ts`
- `apps/claw-frontend/src/lib/i18n/locales/fr.ts`
- `apps/claw-frontend/src/lib/i18n/locales/hi.ts`
- `apps/claw-frontend/src/lib/i18n/locales/it.ts`
- `apps/claw-frontend/src/lib/i18n/locales/ja.ts`
- `apps/claw-frontend/src/lib/i18n/locales/pt.ts`
- `apps/claw-frontend/src/lib/i18n/locales/ru.ts`
- `apps/claw-frontend/src/lib/i18n/locales/th.ts`
- `apps/claw-frontend/src/lib/i18n/locales/zh.ts`
- `apps/claw-frontend/src/repositories/threads/thread-publications.repository.ts`
- `apps/claw-frontend/src/types/i18n.types.ts`
- `apps/claw-frontend/src/types/thread-publication.types.ts`
- `apps/claw-frontend/src/utilities/thread-revision-request.utility.ts`
- `apps/claw-frontend/src/utilities/__tests__/thread-revision-request.utility.test.ts`
- `docs/02-business-product/clawai-threads-product-spec.md`
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `wiki/Threads.md`
- `docs/qa-evidence/2026-10-05-threads-owner-revision-controls.md`
- `docs/wiki/index.md` (generated wiki index)
- `.ai/**`, workspace `AGENTS.md`, and the inventory snapshot (generated).

## Knowledge decisions

The plan, business product spec, wiki, change record, and QA evidence are
updated in this batch. Generated knowledge and inventory are refreshed after
formatting. No new rule, skill, ADR, memory entry, or context map is needed:
this slice adds no new policy, reusable operating procedure, approved product
decision, or service boundary. The existing owner API remains the authority for
authorization, moderation, safety, revisions, exports, and publication state.

## Validation and remaining QA

See `docs/qa-evidence/2026-10-05-threads-owner-revision-controls.md` for each
lane. Local focused tests, lint, typecheck, and Docker health checks are recorded
there. Browser login, authenticated API/RBAC, device/accessibility screenshots,
and live owner UAT remain open while the local auth image cannot build: Prisma
generation rejects a BOM-prefixed installed dependency manifest. CI and release
results will be added after this batch is pushed.

# Change - Threads public reader and community UI

## Files

- `apps/claw-frontend/src/app/(marketing)/threads/[slug]/page.tsx`
- `apps/claw-frontend/src/components/threads/`
- `apps/claw-frontend/src/enums/thread-publication-*.enum.ts`
- `apps/claw-frontend/src/hooks/threads/`
- `apps/claw-frontend/src/repositories/threads/`
- `apps/claw-frontend/src/constants/thread-publication.constants.ts`
- `apps/claw-frontend/src/constants/seo-cluster-routes.constants.ts`
- `apps/claw-frontend/src/app/__tests__/sitemap-coverage.test.ts`
- `apps/claw-frontend/src/types/thread-publication.types.ts`
- `apps/claw-frontend/src/types/i18n.types.ts`
- `apps/claw-frontend/src/utilities/thread-citation.utility.ts`
- `apps/claw-frontend/src/utilities/__tests__/thread-citation.utility.test.ts`
- `apps/claw-frontend/src/**/__tests__/` (repository, hooks, components, utilities)
- `apps/claw-frontend/src/lib/i18n/locales/` (13 locales)
- `docs/02-business-product/clawai-threads-product-spec.md`
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `wiki/Threads.md`
- `docs/qa-evidence/2026-10-05-threads-public-reader-community.md`

## Before

Approved Threads publications had no public reader UI; readers could not use the existing community APIs from the product interface.

## Change

Added a public article route, safe citation links and Markdown rendering, plus authenticated comment, reaction, change request, and report controls. Added all user-facing labels to 13 locales. The route remains noindex pending Batch 7 discovery.

## Now

Owners can share an approved publication route; signed-in readers can participate using the established APIs. Comments expose no reader identity. SEO and discovery remain deferred to Batch 7.

## Why

Deliver the approved publication and community UX while preserving owner approval, privacy, existing moderation, and the noindex rollout boundary.

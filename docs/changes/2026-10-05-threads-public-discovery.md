# Change - Threads public discovery

Batch 7 adds selected content language from owner enqueue through the worker's
author prompt and Threads publication record. Approved articles render on the
server with locale-specific canonical metadata. A localized discovery hub joins
the existing content registry and footer. Locale-filtered APIs provide public
discovery cursors and bounded sitemap pages; localized/global RSS feeds add
Threads independently from chat shares. The chat-share review lockdown remains
unchanged.

Public DTOs omit publication IDs, owner IDs, and evidence IDs. Only a published,
owner-approved, safety-approved, index-eligible revision enters public detail,
discovery, sitemap, and feeds. Current tests/typechecks are recorded in
`docs/qa-evidence/2026-10-05-threads-public-discovery.md`; live public article,
browser, role, and device QA remains open because there is no approved local
publication fixture.

## Code paths traced

.ai/BOOTSTRAP.md
.ai/manifests/api-endpoints.json
.ai/manifests/frontend-routes.json
.ai/manifests/hashes.json
.ai/manifests/i18n.json
.ai/manifests/services.json
.ai/manifests/tests.json
apps/claw-frontend/lighthouserc.json
apps/claw-frontend/lighthouserc.pr.json
apps/claw-frontend/src/app/(marketing)/threads/[slug]/page-client.tsx
apps/claw-frontend/src/app/(marketing)/threads/[slug]/page.tsx
apps/claw-frontend/src/app/(marketing)/threads/discover/page.tsx
apps/claw-frontend/src/app/(portal)/threads/page.tsx
apps/claw-frontend/src/app/**tests**/rss.test.ts
apps/claw-frontend/src/app/sitemap.xml/route.ts
apps/claw-frontend/src/app/sitemaps/[locale]/[document]/route.ts
apps/claw-frontend/src/components/marketing/marketing-footer.tsx
apps/claw-frontend/src/constants/content-registry.constants.ts
apps/claw-frontend/src/constants/public-page-seo-registry.constants.ts
apps/claw-frontend/src/constants/thread-public-api.constants.ts
apps/claw-frontend/src/constants/thread-publication.constants.ts
apps/claw-frontend/src/constants/threads-discovery-seo.constants.ts
apps/claw-frontend/src/hooks/threads/use-thread-public-page.ts
apps/claw-frontend/src/hooks/threads/use-thread-public-queries.ts
apps/claw-frontend/src/lib/discovery/**tests**/rss.service.test.ts
apps/claw-frontend/src/lib/discovery/global-rss.service.ts
apps/claw-frontend/src/lib/discovery/rss.service.ts
apps/claw-frontend/src/lib/i18n/locales/ar.ts
apps/claw-frontend/src/lib/i18n/locales/de.ts
apps/claw-frontend/src/lib/i18n/locales/en.ts
apps/claw-frontend/src/lib/i18n/locales/es.ts
apps/claw-frontend/src/lib/i18n/locales/fa.ts
apps/claw-frontend/src/lib/i18n/locales/fr.ts
apps/claw-frontend/src/lib/i18n/locales/hi.ts
apps/claw-frontend/src/lib/i18n/locales/it.ts
apps/claw-frontend/src/lib/i18n/locales/ja.ts
apps/claw-frontend/src/lib/i18n/locales/pt.ts
apps/claw-frontend/src/lib/i18n/locales/ru.ts
apps/claw-frontend/src/lib/i18n/locales/th.ts
apps/claw-frontend/src/lib/i18n/locales/zh.ts
apps/claw-frontend/src/lib/seo/**tests**/public-page-metadata.test.ts
apps/claw-frontend/src/lib/threads/**tests**/public-thread-api.test.ts
apps/claw-frontend/src/lib/threads/public-thread-api.ts
apps/claw-frontend/src/types/i18n.types.ts
apps/claw-frontend/src/types/thread-publication.types.ts
apps/claw-frontend/src/utilities/**tests**/thread-generation-request.utility.test.ts
apps/claw-frontend/src/utilities/thread-generation-request.utility.ts
apps/claw-thread-generation-service/src/modules/generation/dto/enqueue-generation.dto.ts
apps/claw-thread-generation-service/src/modules/generation/dto/enqueue-revision-review.dto.ts
apps/claw-thread-generation-service/src/modules/generation/managers/**tests**/generation-pipeline.manager.spec.ts
apps/claw-thread-generation-service/src/modules/generation/managers/generation-pipeline.manager.ts
apps/claw-thread-generation-service/src/modules/generation/repositories/generation-jobs.repository.ts
apps/claw-thread-generation-service/src/modules/generation/services/**tests**/generation-jobs.service.spec.ts
apps/claw-thread-generation-service/src/modules/generation/services/generation-jobs.service.ts
apps/claw-thread-generation-service/src/modules/generation/types/generation-pipeline.types.ts
apps/claw-threads-service/AGENTS.md
apps/claw-threads-service/prisma/migrations/20261005190000_threads_publication_discovery_metadata/migration.sql
apps/claw-threads-service/prisma/schema.prisma
apps/claw-threads-service/src/modules/publications/controllers/**tests**/publication-discovery.controller.spec.ts
apps/claw-threads-service/src/modules/publications/controllers/publication-discovery.controller.ts
apps/claw-threads-service/src/modules/publications/dto/**tests**/start-thread-generation.dto.spec.ts
apps/claw-threads-service/src/modules/publications/dto/public-discovery-query.dto.ts
apps/claw-threads-service/src/modules/publications/dto/start-thread-generation.dto.ts
apps/claw-threads-service/src/modules/publications/publications.module.ts
apps/claw-threads-service/src/modules/publications/repositories/**tests**/publications.repository.spec.ts
apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts
apps/claw-threads-service/src/modules/publications/services/**tests**/publication-discovery.service.spec.ts
apps/claw-threads-service/src/modules/publications/services/**tests**/publication-lifecycle.service.spec.ts
apps/claw-threads-service/src/modules/publications/services/publication-discovery.service.ts
apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts
apps/claw-threads-service/src/modules/publications/services/threads-generation.client.ts
apps/claw-threads-service/src/modules/publications/types/publication.types.ts
apps/claw-threads-service/src/modules/publications/utilities/**tests**/publication-excerpt.utility.spec.ts
apps/claw-threads-service/src/modules/publications/utilities/publication-excerpt.utility.ts
docs/02-business-product/clawai-threads-product-spec.md
docs/03-architecture/clawai-threads-architecture.md
docs/05-frontend/multilingual-discovery.md
docs/changes/2026-10-05-threads-public-discovery.md
docs/features/ai-native-engineering-os/inventory.snapshot.json
docs/qa-evidence/2026-10-05-threads-public-discovery.md
docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md
memory/2026-10-04-clawai-threads-product-decisions.md
packages/shared-types/src/enums/index.ts
packages/shared-types/src/enums/thread-publication-type.enum.ts
wiki/Threads.md
apps/claw-threads-service/src/modules/publications/constants/publication-discovery.constants.ts

The pre-push frontend suite surfaced four reviewed-surface regressions. The localized SEO records now meet the existing description threshold, the discovery grid declares base columns, and the registry test includes the new page. The focused regression specs pass after these fixes.

apps/claw-frontend/src/app/(marketing)/threads/discover/page.tsx
apps/claw-frontend/src/constants/threads-discovery-seo.constants.ts
apps/claw-frontend/src/utilities/**tests**/content-registry.utility.test.ts
apps/claw-frontend/src/components/common/**tests**/bounded-grid-tracks.test.ts

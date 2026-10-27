# Change - Paid model access and Thread retry recovery

## Files

- `docs/05-frontend/admin-model-billing-and-exposure.md` (M)
- `apps/claw-frontend/package.json` (M)
- `docs/features/paid-model-access/README.md` (A)
- `docs/qa-evidence/2026-10-27-paid-model-classes.md` (M)
- `.ai/manifests/hashes.json` (M)
- `.ai/manifests/i18n.json` (M)
- `apps/claw-auth-service/CLAUDE.md` (M)
- `apps/claw-auth-service/prisma/seeders/plan-catalog.json` (M)
- `apps/claw-auth-service/prisma/seeders/plan-catalog.seeder.cjs` (M)
- `apps/claw-auth-service/src/modules/credit/credit.module.ts` (M)
- `apps/claw-auth-service/src/modules/entitlements/services/__tests__/runtime-admission.service.spec.ts` (M)
- `apps/claw-auth-service/src/modules/entitlements/services/entitlements.service.ts` (M)
- `apps/claw-auth-service/src/modules/entitlements/services/runtime-admission.service.ts` (M)
- `apps/claw-auth-service/src/modules/entitlements/types/entitlements.types.ts` (M)
- `apps/claw-auth-service/src/modules/plans/__tests__/plan-catalog.spec.ts` (M)
- `apps/claw-auth-service/src/modules/plans/__tests__/plugin-calls-plan-gate.spec.ts` (M)
- `apps/claw-auth-service/src/modules/plans/__tests__/plugins-plan-gate.spec.ts` (M)
- `apps/claw-auth-service/src/modules/plans/dto/plan-misc.dto.ts` (M)
- `apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts` (M)
- `apps/claw-auth-service/src/modules/plans/repositories/plans.repository.ts` (M)
- `apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts` (M)
- `apps/claw-auth-service/src/modules/plans/services/plans.service.ts` (M)
- `apps/claw-auth-service/src/modules/plans/types/plan-catalog-seeder.types.ts` (M)
- `apps/claw-auth-service/src/modules/plans/types/plan-catalog.types.ts` (M)
- `apps/claw-auth-service/src/modules/plans/utilities/plan-catalog.utility.ts` (M)
- `apps/claw-chat-service/CLAUDE.md` (M)
- `apps/claw-chat-service/src/modules/chat-messages/clients/model-exposure.client.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/__tests__/access-control.service.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/access-control.service.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/chat-messages.service.ts` (M)
- `apps/claw-frontend/src/app/(portal)/admin/plans/[id]/model-access/page.tsx` (M)
- `apps/claw-frontend/src/components/admin/plans/__tests__/model-access-editor.test.tsx` (M)
- `apps/claw-frontend/src/components/admin/plans/model-access-editor.tsx` (M)
- `apps/claw-frontend/src/components/marketing/home/plan-tier-card.tsx` (M)
- `apps/claw-frontend/src/hooks/plans/use-model-access-page.ts` (M)
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
- `apps/claw-frontend/src/lib/pricing/public-pricing-api.ts` (M)
- `apps/claw-frontend/src/types/i18n.types.ts` (M)
- `apps/claw-frontend/src/types/plan.types.ts` (M)
- `apps/claw-frontend/src/types/public-pricing.types.ts` (M)
- `apps/claw-routing-service/CLAUDE.md` (M)
- `apps/claw-routing-service/src/modules/router-models/services/model-cost.service.ts` (M)
- `apps/claw-routing-service/src/modules/routing/services/routing.service.ts` (M)
- `apps/claw-routing-service/src/modules/routing/types/routing.types.ts` (M)
- `apps/claw-routing-service/src/modules/routing/utilities/__tests__/plan-model-gate.utility.spec.ts` (M)
- `apps/claw-routing-service/src/modules/routing/utilities/plan-model-gate.utility.ts` (M)
- `apps/claw-thread-generation-service/CLAUDE.md` (M)
- `apps/claw-thread-generation-service/src/modules/generation/managers/__tests__/generation-pipeline.manager.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/managers/generation-pipeline.manager.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.owner-actions.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.retry-reserve.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.retry-resume.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.service.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/services/generation-jobs.service.ts` (M)
- `docs/04-backend/service-guide-thread-generation.md` (M)
- `docs/06-data/plan-and-quota-specification.md` (M)
- `docs/qa-evidence/2026-10-27-thread-generation-recovery.md` (M)
- `memory/2026-10-27-thread-generation-recovery.md` (M)
- `packages/shared-entitlements/src/__tests__/helpers.spec.ts` (M)
- `packages/shared-entitlements/src/helpers.ts` (M)
- `packages/shared-entitlements/src/types.ts` (M)

## Before

Free model access was not consistently bounded by model cost class, and stale pricing copy implied that Premium models started at Pro. A production Thread also exhausted three review rounds and then replayed the same cached model outputs on automatic retries.

## Change

PREMIUM and ULTRA classes are blocked for Free and available on paid plans; the rule is enforced across plan entitlements, chat, routing and Runtime V2. Plan editors and public pricing cards expose the configured classes, and all 13 locale files describe paid access consistently. Thread review exhaustion now ends without redundant retries; an owner retry keeps saved research but refreshes model replies after review rejection.

## Now

Focused retry/pipeline verification passed 100 tests. All 19 affected workspaces typechecked; affected workspace lint and tests passed. CI caught a Turbopack Google Font module resolution failure; switching the production build to Webpack and removing duplicate Browserslist configuration passed locally, including all 258 routes. Production still shows the Thread as unpublished; release and a fresh owner retry remain pending.

## Why

Prevent expensive models from consuming Free allowances while making plan access explicit. Prevent retry loops from spending effort on unchanged rejected drafts while preserving completed research and the Judge/Critic publication gates.

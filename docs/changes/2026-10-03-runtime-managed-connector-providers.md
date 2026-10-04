# Change - Runtime managed connector providers

## Files

- `apps/claw-connector-service/prisma/migrations/20261003120000_runtime_managed_connector_providers/migration.sql` (A)
- `apps/claw-connector-service/prisma/migrations/20261003140000_provider_adapter_code_managed/migration.sql` (A)
- `apps/claw-connector-service/prisma/migrations/20261003150000_seed_builtin_provider_definitions/migration.sql` (A)
- `apps/claw-connector-service/src/modules/connectors/controllers/provider-definitions.controller.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/dto/__tests__/create-provider-definition.dto.spec.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/dto/create-provider-definition.dto.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/dto/list-provider-definitions-query.dto.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/dto/provider-definition-status.dto.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/dto/update-provider-definition.dto.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/repositories/provider-definitions.repository.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/repositories/connectors.repository.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/services/provider-definitions.service.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/services/__tests__/provider-definitions.service.spec.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/types/provider-definition.types.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/utilities/provider-url.utility.ts` (A)
- `apps/claw-connector-service/src/modules/connectors/utilities/runtime-provider-preset.utility.ts` (A)
- `apps/claw-frontend/src/app/(portal)/connectors/providers/page.tsx` (A)
- `apps/claw-frontend/src/enums/provider-adapter-family.enum.ts` (A)
- `apps/claw-frontend/src/enums/provider-models-response-format.enum.ts` (A)
- `apps/claw-frontend/src/lib/i18n/locales/provider-management-translations.ts` (A)
- `apps/claw-frontend/src/repositories/connectors/provider-definition.repository.ts` (A)
- `apps/claw-frontend/src/types/provider-definition.types.ts` (A)
- `apps/claw-frontend/tests/e2e/provider-management.spec.ts` (A)
- `apps/claw-routing-service/prisma/migrations/20261003130000_runtime_provider_identity/migration.sql` (A)
- `docs/13-adr/adr-157-runtime-managed-connector-providers.md` (A)
- `docs/features/runtime-managed-connector-providers/00-intake.md` (A)
- `docs/features/runtime-managed-connector-providers/01-business-analysis.md` (A)
- `docs/features/runtime-managed-connector-providers/02-product-requirements.md` (A)
- `docs/features/runtime-managed-connector-providers/03-acceptance-criteria.md` (A)
- `docs/features/runtime-managed-connector-providers/04-scope-and-non-goals.md` (A)
- `docs/features/runtime-managed-connector-providers/06-delivery-plan.md` (A)
- `docs/features/runtime-managed-connector-providers/08-architecture.md` (A)
- `docs/features/runtime-managed-connector-providers/09-impact-analysis.md` (A)
- `docs/features/runtime-managed-connector-providers/10-security-analysis.md` (A)
- `docs/features/runtime-managed-connector-providers/11-data-and-migration-plan.md` (A)
- `docs/features/runtime-managed-connector-providers/12-test-strategy.md` (A)
- `docs/features/runtime-managed-connector-providers/15-implementation-notes.md` (A)
- `docs/features/runtime-managed-connector-providers/16-developer-validation.md` (A)
- `docs/features/runtime-managed-connector-providers/17-QA-evidence.md` (A)
- `docs/features/runtime-managed-connector-providers/20-UAT.md` (A)
- `docs/features/runtime-managed-connector-providers/21-go-no-go.md` (A)
- `docs/features/runtime-managed-connector-providers/23-rollback-plan.md` (A)
- `docs/qa-evidence/2026-10-03-runtime-managed-connector-providers.md` (A)
- `docs/qa-evidence/screenshots/runtime-managed-connector-providers/desktop-1366x768.png` (A)
- `docs/qa-evidence/screenshots/runtime-managed-connector-providers/landscape-844x390.png` (A)
- `docs/qa-evidence/screenshots/runtime-managed-connector-providers/mobile-360x740.png` (A)
- `docs/qa-evidence/screenshots/runtime-managed-connector-providers/mobile-390x844.png` (A)
- `docs/qa-evidence/screenshots/runtime-managed-connector-providers/rtl-mobile-390x844.png` (A)
- `docs/qa-evidence/screenshots/runtime-managed-connector-providers/tablet-768x1024.png` (A)
- `.ai/BOOTSTRAP.md` (M)
- `.ai/manifests/api-endpoints.json` (M)
- `.ai/manifests/data-ownership.json` (M)
- `.ai/manifests/frontend-routes.json` (M)
- `.ai/manifests/governance.json` (M)
- `.ai/manifests/hashes.json` (M)
- `.ai/manifests/prisma-models.json` (M)
- `.ai/manifests/services.json` (M)
- `.ai/manifests/tests.json` (M)
- `apps/claw-connector-service/AGENTS.md` (M)
- `apps/claw-agent-service/src/app/__tests__/mobile-token-route-inventory.spec.ts` (M)
- `apps/claw-health-service/src/modules/health/controllers/__tests__/status-page.controller.spec.ts` (M)
- `apps/claw-frontend/src/app/(portal)/connectors/providers/page.tsx` (M)
- `apps/claw-frontend/src/enums/__tests__/enums.test.ts` (M)
- `apps/claw-frontend/src/lib/i18n/__tests__/i18n-key-references.test.ts` (M)
- `apps/claw-frontend/src/stores/__tests__/feedback-dialog.store.test.ts` (M)
- `docs/qa-evidence/2026-10-03-runtime-managed-connector-providers.md` (M)
- `apps/claw-connector-service/prisma/schema.prisma` (M)
- `apps/claw-connector-service/src/modules/connectors/__tests__/connectors.manager.spec.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/__tests__/connectors.service.spec.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/connectors.module.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/dto/create-connector.dto.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/dto/update-connector.dto.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/managers/connectors.manager.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/managers/models-snapshot.manager.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/repositories/__tests__/connectors.repository.spec.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/repositories/connectors.repository.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/services/connectors.service.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/services/credit-headroom.service.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/types/connectors.types.ts` (M)
- `apps/claw-connector-service/src/modules/connectors/utilities/preset-model-list.utility.ts` (M)
- `apps/claw-frontend/src/app/(portal)/connectors/page.tsx` (M)
- `apps/claw-frontend/src/app/(portal)/models/page.tsx` (M)
- `apps/claw-frontend/src/components/connectors/connector-card.tsx` (M)
- `apps/claw-frontend/src/components/connectors/model-card.tsx` (M)
- `apps/claw-frontend/src/components/connectors/model-table.tsx` (M)
- `apps/claw-frontend/src/constants/connector.constants.ts` (M)
- `apps/claw-frontend/src/constants/index.ts` (M)
- `apps/claw-frontend/src/constants/routes.constants.ts` (M)
- `apps/claw-frontend/src/enums/connector-provider.enum.ts` (M)
- `apps/claw-frontend/src/enums/index.ts` (M)
- `apps/claw-frontend/src/hooks/connectors/use-connector-provider-combobox.ts` (M)
- `apps/claw-frontend/src/lib/i18n/__tests__/translations.test.ts` (M)
- `apps/claw-frontend/src/lib/i18n/dictionary-loader.ts` (M)
- `apps/claw-frontend/src/lib/i18n/translations.ts` (M)
- `apps/claw-frontend/src/types/connector.types.ts` (M)
- `apps/claw-frontend/src/types/i18n.types.ts` (M)
- `apps/claw-frontend/src/types/index.ts` (M)
- `apps/claw-routing-service/prisma/schema.prisma` (M)
- `apps/claw-routing-service/src/modules/router-models/repositories/model-discovery.repository.ts` (M)
- `apps/claw-routing-service/src/modules/router-models/types/model-discovery.types.ts` (M)
- `apps/claw-routing-service/src/modules/routing/__tests__/model-deployment.repository.spec.ts` (M)
- `apps/claw-routing-service/src/modules/routing/repositories/model-deployment.repository.ts` (M)
- `apps/claw-routing-service/src/modules/routing/types/model-deployment.types.ts` (M)
- `apps/claw-routing-service/src/modules/routing/utilities/__tests__/cloud-router-candidates.utility.spec.ts` (M)
- `apps/claw-routing-service/src/modules/routing/utilities/cloud-router-candidates.utility.ts` (M)
- `apps/claw-routing-service/src/modules/routing/utilities/picked-model-substitute.utility.ts` (M)
- `context/architecture-map.md` (M)
- `docs/04-backend/service-guide-connector.md` (M)
- `docs/07-integrations/provider-catalog.md` (M)
- `docs/12-reference/api-reference-connectors.md` (M)
- `docs/13-adr/adr-index.md` (M)
- `docs/README.md` (M)
- `docs/features/ai-native-engineering-os/inventory.snapshot.json` (M)
- `package-lock.json` (M)
- `packages/shared-types/src/enums/connector-provider.enum.ts` (M)
- `packages/shared-types/src/types/connector-preset.type.ts` (M)
- `packages/shared-types/src/types/model-option.type.ts` (M)
- `packages/shared-utilities/src/connector-presets/__tests__/connector-presets.spec.ts` (M)
- `skills/add-provider-connector.md` (M)
- `wiki/Runtime-Managed-Connector-Providers.md` (A)
- `wiki/Home.md` (M)
- `wiki/_Sidebar.md` (M)

## Before

Provider presets were code-managed, so adding a compatible provider required a
code change. Administrators could not manage built-in provider availability or
persist custom provider identity through routing.

## Change

Added database-backed OpenAI-compatible provider definitions, protected built-in
status controls, backfill links, admin CRUD and connector creation, encrypted
connector credentials, and stable runtime model identity through routing. The
second pack validated NVIDIA NIM's mocked OpenAI-compatible model-list
contract; its three specialized protocols remain out of scope.

## Now

Administrators can manage custom definitions and toggle built-in providers;
user-facing labels cover all 13 locales; connector and routing services
preserve custom provider keys. Release validation remains open, so release is
NO-GO.

## Why

The owner asked for provider management to move from prompts/code to persistent
admin-managed data, while keeping new protocol behavior reviewed in versioned
adapters. The three specialized pack-2 APIs do not share the generic adapter.

## Alternatives

Implement each pack-2 provider as a new protocol adapter in this batch, or keep
provider definitions code-only. The implementation uses the existing adapter
for NIM and records the other three protocols as separate work.

## Verification

- Connector: typecheck/build pass; 50 files and 736 tests pass.
- Routing: typecheck/build pass; 117 files and 1,783 tests pass.
- Frontend: typecheck/build pass; locale suite 1 file and 61 tests pass.
- Shared types: typecheck/build pass; 5 files and 21 tests pass.
- Shared utilities: typecheck/build pass; 51 files and 962 tests pass.
- Admin Playwright flow: 1 passed; screenshots cover five widths/orientations
  and RTL.
- Local API CRUD: login 200, create 201, list 200, delete 200.
- Both Prisma schemas validate; knowledge verify/check, inventory check, QA
  evidence check, changed-path trace check and Wiki index check pass.
- Open release lanes are listed in the QA evidence record; GitHub CI was not run.
- The changed-file secret guard found no matches. The repository-wide Akinator
  coverage/rules checks report existing repository findings; the strict report
  returned 832 findings, and no new rule was created for this feature.
- The pre-push route-inventory test now asserts the unauthorized status and
  exception name across module boundaries; its 11-test file passes.
- The complete frontend suite passes 5,361 tests, including the custom provider
  identity sentinel, bounded base grid tracks, and supplemental i18n keys.
- Broader pre-push checks exposed an exception identity assertion and delayed
  focus assertion; tests now verify the HTTP contract and await focus restoration.
- The health status controller unit test stubs its class guards because that test
  only covers service delegation.

## Stale when

Provider protocol support, permission semantics, runtime identity, the QA state,
or the release decision changes.

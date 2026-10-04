# Delivery plan: runtime managed connector providers

Date: 2026-10-03  
Status: implementation delivered; release validation PARTIAL

## Objective and definition of done

Let administrators create OpenAI-compatible provider definitions and connector
instances. Definitions must flow through model sync, catalog, routing and chat
configuration. Credentials stay encrypted and separated. Built-in provider
identity stays stable. Pack 2 is used as a compatibility acceptance matrix, not
as a mandate to implement three unrelated protocols.

Implementation validation covers schema/type checks, static migration review,
scoped workspace gates, the custom-provider admin UI/API path, and the mocked
NVIDIA NIM model contract. The isolated worktree has no connector DB URL, so
the new seed/backfill migrations have not been applied. Release completion additionally requires all open QA lanes, clean
install and upgrade migration checks, generated-artifact checks, and the
release version bump. No release version was bumped in this implementation
batch.

## Plan batches and knowledge delta

| Batch                        | Work                                                                                                                       | Knowledge delta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Data and runtime          | Definition schema/API, encrypted connector link, adapter lookup, model identity, route identity                            | `docs/13-adr/adr-157-runtime-managed-connector-providers.md`, `docs/13-adr/adr-index.md`, `docs/04-backend/service-guide-connector.md`, `docs/12-reference/api-reference-connectors.md`, `docs/07-integrations/provider-catalog.md`, `context/architecture-map.md`, this feature dossier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2. Admin and product         | `/connectors/providers`, localized management, create connector flow, CRUD/status/dependency rules                         | this feature dossier, `skills/add-provider-connector.md`, `docs/qa-evidence/2026-10-03-runtime-managed-connector-providers.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3. Verification              | NIM mocked model discovery and runtime identity; scoped type/build/test/Prisma checks; manual QA                           | `docs/qa-evidence/2026-10-03-runtime-managed-connector-providers.md`, this dossier's validation, UAT, go/no-go, rollback records                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 4. Built-in catalog controls | Seed and link all provider enum identities; protect built-in identity and adapter behavior; add Admin status-only controls | `apps/claw-connector-service/prisma/schema.prisma`, both `20261003140000_provider_adapter_code_managed` and `20261003150000_seed_builtin_provider_definitions` migration SQL files, `apps/claw-connector-service/src/modules/connectors/services/provider-definitions.service.ts`, `apps/claw-connector-service/src/modules/connectors/services/connectors.service.ts`, `apps/claw-connector-service/src/modules/connectors/services/__tests__/provider-definitions.service.spec.ts`, `apps/claw-connector-service/src/modules/connectors/managers/connectors.manager.ts`, `apps/claw-connector-service/src/modules/connectors/repositories/connectors.repository.ts`, `apps/claw-connector-service/src/modules/connectors/repositories/__tests__/connectors.repository.spec.ts`, `apps/claw-frontend/src/app/(portal)/connectors/providers/page.tsx`, `apps/claw-frontend/src/types/provider-definition.types.ts`, `apps/claw-frontend/src/types/i18n.types.ts`, `apps/claw-frontend/src/enums/provider-adapter-family.enum.ts`, `apps/claw-frontend/src/lib/i18n/locales/provider-management-translations.ts`, business requirements register, ADR-157, connector service guide, provider catalog, connector API reference, feature dossier, root Wiki page, and QA record |

The full knowledge delta is this feature dossier, the QA record,
`docs/13-adr/adr-157-runtime-managed-connector-providers.md`,
`docs/13-adr/adr-index.md`, `docs/04-backend/service-guide-connector.md`,
`docs/12-reference/api-reference-connectors.md`,
`docs/07-integrations/provider-catalog.md`, `context/architecture-map.md`, and
`skills/add-provider-connector.md`, `docs/README.md`,
`docs/wiki/index.md`, `wiki/Runtime-Managed-Connector-Providers.md`, `wiki/Home.md`, and
`wiki/_Sidebar.md`. No new rule is needed: existing
authorization, secret handling, i18n, outbound destination, and PAYG rules
cover the implementation. Regenerate `.ai/**`, workspace routers, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` after source
and documentation edits settle.

Knowledge homes follow the existing docs hub and versioned root `wiki/` GitHub
Wiki source; no parallel `docs/wiki/` is introduced. Product/business and
requirements live in the feature dossier and requirements register;
architecture/decisions in the architecture map and ADR; data/migration in the
dossier and Prisma migrations; integration details in the provider catalog and
API reference; testing/UAT in the QA record and UAT page; operations/rollback
in the delivery and rollback plans. Library and stack facts did not change,
and no dependency was added. The Akinator wiki checker expects
`docs/wiki/index.md`; this repository's wiki source is `wiki/`, so its index is
updated directly instead of adding a duplicate wiki.

## Architecture decisions

- Keep the built-in enum identities. Custom connector rows use
  `CUSTOM_OPENAI_COMPATIBLE` plus a definition foreign key.
- Seed every built-in enum identity into the definition catalog and backfill
  existing connector references. `CODE_MANAGED` definitions keep bespoke
  adapters in control; preset definitions continue using the shared registry.
- Permit status-only changes to built-ins. Their key, adapter family, endpoints,
  and physical row are protected.
- Carry custom keys from model catalog through a routing enum sentinel plus the
  `ModelDeployment.runtimeProviderKey` string. The routing deployment enum is
  therefore extended additively; a dynamic provider name never becomes code.
- Use the existing OpenAI-compatible adapter only. Provider data is validated;
  protocol behavior stays in versioned code.
- Reuse `ADMIN_CONNECTORS_MANAGE` for backend and route authorization.
- Keep custom provider definitions once ever connected. This conservatively
  protects downstream model, cost and routing history without cross-service DB
  queries.
- Treat definition PAYG false as the default. No rate or free-use claim is
  inferred from metadata.

## Scope boundary and known gaps

NVIDIA NIM uses `https://integrate.api.nvidia.com` with `/v1/models` in a mocked
test. Hugging Face task APIs, Pollinations media APIs, and AI Horde async
execution are not supported by this generic flow. A live NIM request was not
run because no credential was configured.

Built-in definitions are seeded and visible; the page exposes activation
controls while keeping their identity and adapter data protected. The local
admin browser flow and routed provider-definition API CRUD passed. RBAC across roles/tiers,
Lighthouse/accessibility/performance, live NIM chat, and CI remain unrun; see the
QA evidence record.

## Validation and release gate

Affected workspaces include `packages/shared-types`, connector-service,
routing-service, and frontend. Typecheck, lint, test and build passed in the
three service/UI workspaces; both Prisma schemas validate. Clean-install/upgrade migration checks, knowledge
and inventory gates, RBAC, Lighthouse/accessibility/performance, and GitHub CI
remain open. The QA record distinguishes observed passes from these gaps.

The 4-free-connectors pack is used as an NVIDIA NIM compatibility test for the
generic OpenAI-compatible adapter. Its Hugging Face, Pollinations, and AI Horde
protocol-specific connectors remain separate work because their APIs require
different adapters.

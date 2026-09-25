# Claw Routing Service - Development Rules

## Service Overview

Routing microservice for the Claw platform. Manages AI routing decisions and policies. Runs on port 4004 with its own PostgreSQL database (claw_routing).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM (claw_routing database, port 5444)
- **Cache**: Redis (ioredis)
- **Messaging**: RabbitMQ (amqplib)
- **Validation**: Zod (NOT class-validator, NOT class-transformer)
- **Auth**: JWT (jsonwebtoken) for token verification
- **Logging**: nestjs-pino / pino structured logging

## Absolute Rules

1. **NEVER use `any`** -- use `unknown`, generics, or proper types.
2. **NEVER disable ESLint rules** -- no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
3. **NEVER use `console.log`** -- use the NestJS `Logger` service.
4. **NEVER use `!` non-null assertion** -- handle nullability explicitly.
5. **NEVER use `process.env` directly** -- use `AppConfig` from `src/app/config/app.config.ts`.
6. **NEVER put business logic in controllers** -- controllers call exactly ONE service method.
7. **NEVER put Prisma calls outside repositories** -- repositories are the sole data-access layer.
8. **EVERY function must have an explicit return type**.
9. **Service methods max 30 lines**.
10. **Controllers are 3-line methods**: extract params, call ONE service, return result.
11. **All errors use BusinessException with a code**.
12. **No default exports** -- use named exports exclusively.

## No Inline Declarations Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service, controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`
  Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/jwt.utility.ts` wraps `jsonwebtoken`, and services import `{ signToken, verifyToken }` from the wrapper.

## Architecture

```
Controller -> Service -> Repository
```

## Owned Tables

- RoutingDecision
- RoutingPolicy
- ModelDeployment — one reachable endpoint for one RouterModelRegistry definition.
  A definition can have several (direct API, private cloud, local runtime) with
  their own credentials, region, privacy class, limits, price and health. Stores
  only a `connectorId` reference; provider keys stay in connector-service.
- CapabilityEvidence — one sourced capability claim about a definition or a
  deployment, carrying provenance, confidence and expiry so a marketing claim is
  never indistinguishable from a measured probe.
- RouterConfiguration + RouterChainEntry — immutable revisions of the router's
  ordered fallback chain. An edit publishes revision N+1 and supersedes N, so a
  decision can always be traced back to the exact chain that produced it. A
  partial unique index enforces at most one PUBLISHED revision per scope.
- ModelCostVersion — immutable per-model price versions. Rates are integer
  micro-USD per million tokens; `activeKey` is an emulated partial-unique index
  so the database itself rejects a second ACTIVE price for one model. An
  automated sync must NEVER overwrite `isAdminOverride`.
- SeedExecution — ledger for versioned seeds (`cloud-smart-router-default-v1`,
  `router-model-deployments-backfill`, `model-cost-list-prices-2026-v1`). Seeds
  take a transaction-scoped advisory lock and never overwrite admin edits.

## Commands

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type check
npm run validate     # typecheck + lint:strict + format:check
npm run test         # Run unit tests
npm run migrate:dev  # Create and run migration
npm run prisma:generate  # Regenerate Prisma client
```

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop routing-service
./scripts/claw.sh rm -f routing-service
docker rmi claw-routing-service
./scripts/claw.sh up -d --build routing-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output

## Llamacpp runtime health

`LlamacppHealthManager` (`src/modules/routing/managers/llamacpp-health.manager.ts`) polls `${LLAMACPP_SERVICE_URL}/api/v1/health` every 30 s and subscribes to `llamacpp.model.{loaded,unloaded,crashed}` events. Populates `runtimeHealthCache.set(LLAMACPP_RUNTIME, ...)` consumed by `RoutingManager.isRuntimeHealthy()` for fallback decisions. NEVER call the manager directly from a controller — use the cache via `RoutingService.evaluateRoute()`. Uses the existing `httpRequest` utility (do NOT add `undici` as a dep here).

## Model prices are SEEDED, and that seed is launch-blocking

`ModelCostVersion` shipped with a schema, a service, a controller and a spec but
no seeder, so on a fresh install the price table was **empty**. PAYG treats an
unpriced model on a metered provider as **blocked, never free** — an unpriced
model is an unbounded liability, not a giveaway — so an empty table refused
every paid request on day one.

`ModelCostSeedService` (`OnModuleInit`) + `ModelCostSeedRepository` fix that,
following the same run-once mechanism as `DeploymentSeedService`:
transaction-scoped advisory lock (`MODEL_COST_SEED_LOCK_ID = 740_040_003`, next
in routing-service's `740_040_00N` block) → `SeedExecution` ledger row keyed on
(name, version) → checksum comparison.

- Prices live in `constants/model-cost-seed.constants.ts`. **LIST prices from
  public price cards** — estimates an operator should verify against their own
  invoices, not a contract. 16 models: OpenAI ×6, Anthropic ×3, Gemini ×3,
  DeepSeek ×2, Grok ×2.
- Seeded as `source: SEED, confidence: ESTIMATED, isAdminOverride: false`, so a
  later automated sync MAY refresh them. **An admin override is never
  clobbered** — not by the seed, not by `applySyncedRates`.
- The seed only ever **fills a gap**. A model that already has ANY price history
  is skipped, which both protects an override and keeps the version counter
  honest (a retired v1 would collide on `@@unique([provider, modelKey, version])`).
- Changing a price without bumping `MODEL_COST_SEED_VERSION` is a
  `CHECKSUM_MISMATCH` warning and writes **nothing**. Bump the version to apply.
- **Per-unit models** (seed v4, 2026-09-25): OpenAI `gpt-image-1` $0.167,
  `dall-e-3` $0.040, `dall-e-2` $0.020 **per image** (`imagePerUnitMicroUsd`),
  output token rate `0` so an image is never billed twice. `ModelCostVersion`
  also carries `ttsPerCharacterMicroUsd` (migration
  `20260925120000_add_tts_per_character_rate`); `audioPerUnitMicroUsd` means per
  SECOND of input audio. A per-unit row is excluded from
  `findMostExpensiveForProvider`, or it would price an unknown chat model's
  output at $0.
- **Correcting a seeded price**: set `supersedesSeededPrice: true` on the entry
  and bump the seed version. A model whose ACTIVE row is still `source: SEED`
  (never an override, never a synced row) and whose rates differ gets that row
  retired and a new version appended, and `ModelCostSeedService` publishes
  `routing.model_cost.published` for it so auth's 300 s rate cache drops.
- Reasoning is priced at the output rate wherever it is set, because no provider
  bills it differently. `calculateCostMicroUsd` sums reasoning and output as
  **disjoint** buckets, so a caller must never put reasoning tokens in both.

## `routing.model_cost.published`

`ModelCostService.publish()` emits `EventPattern.ROUTING_MODEL_COST_PUBLISHED`
with `{ provider, modelKey, version }` — **never a rate**, because a topic
exchange is readable by any consumer that binds the pattern and a rate is a
margin input. auth-service consumes it to bust the rate cache it holds for 300 s
while reserving PAYG credit, so an administrator's repricing lands on the next
request instead of at the end of the TTL.

`applySyncedRates` routes through `publish`, so the event fires exactly when a
rate ACTUALLY changed — never on `ADMIN_OVERRIDE_ACTIVE` or `RATES_UNCHANGED`.
Publishing is `@Optional()` and fire-and-forget: the price is authoritative in
Postgres the moment the transaction commits, so a dead broker degrades to a
300 s staleness window rather than failing the repricing.

The seeder deliberately does NOT publish. At first boot there is nothing cached
to bust.

## The router meters its own paid calls (U5/U6)

The cloud router calls **real, billed models** (Gemini, Ollama Cloud) to decide
where a message goes. Those adapters always returned true token counts, which
landed in `router_attempts` and went no further.

`RouterInferenceCoordinatorManager.invokeMetered` now wraps every
`adapter.invoke` in a `PaygMeter` reserve → finalize / release cycle at
`PaygSurface.ROUTING`.

- **`userId` is carried, never derived.** It comes off the `message.created`
  event (chat-service has always published it; `parseMessageCreatedPayload` used
  to drop it) and travels `RoutingContext` → `CloudRouteRequest` →
  `RouterCoordinatorOptions`. A walk without one is left **unmetered**, not
  billed to a guess.
- **One hold per ATTEMPT**, keyed `${traceId}:${entryId}:${attemptNumber}`.
  `reserve` is idempotent on `(userId, requestId)`, and a retry inside an entry
  is a second paid call — sharing the key would silently under-charge every
  retried route.
- **The granted ceiling always wins.** `hold.maxOutputTokens` is passed to the
  adapter as `request.maxOutputTokens`, which both cloud adapters prefer over
  `ROUTER_MAX_OUTPUT_TOKENS`. That is what makes an overspend impossible by
  construction rather than by reconciliation.
- **Fails closed, degrades to local.** A refused reservation — exhausted credit
  OR an unreachable auth-service — becomes `RouterErrorCode.BUDGET_EXCEEDED`,
  which is REQUEST-scoped, so the walk stops, `tryCloudRouting` returns null and
  AUTO mode drops to the local heuristic router. The user gets an answer, not a
  refusal (D4).
- **Classification is auth-service's, never this service's.** A local model
  comes back `metered: false` from `reserve`. Do NOT compile the predicate in
  here — six `node_modules` copies would make the connector admin toggle
  unenforceable without a six-container rebuild (ADR-082). `OLLAMA_CLOUD` is a
  routing-only provider name connector-service does not carry, so it resolves
  unclassified and therefore free, which is the default D1/A3 chose.

## `cost-budget/` was deleted (ADR-081)

Per-user spend capping is owned by the **auth-service PAYG credit wallet**, not
by routing-service. The module never shipped: it was never registered in
`app.module.ts`, `spend-tracker.manager.ts` threw `SCAFFOLD-R4`,
`UserCostBudget` was never in the Prisma schema, and its controller carried
seven handlers with no `@RequirePermissions`. Do not resurrect it —
`docs/15-ai-context/routing-flagship-streams/05-r4-cost-budget-intelligence.md`
is marked SUPERSEDED with the reasoning.

What routing-service keeps is **model prices** and **metering its own calls**.
It does not decide whether a user may spend.

## `GET /router-models/costs/catalog` — the only view of what a model costs

`ModelCostVersion` had a publish API and no way to READ the whole picture:
`GET /router-models/costs` lists only the rows that EXIST, which is exactly the
models that are not the problem. An operator could not see the 161 of 170
exposed models that have no price and are therefore charged at the provider's
dearest known rate.

`ModelCostCatalogService.listCatalog()` joins `RouterModelRegistry` (via the new
`RouterModelRegistryRepository.listCatalogEntries()`, a narrow
provider/modelKey/displayName projection that skips REMOVED rows) with the rate
`ModelCostService.getSnapshot` actually resolves.

- **It owns no resolution logic.** Every rate comes from the same `getSnapshot`
  the wallet calls, so the table can never disagree with what a user is charged.
  A second implementation would drift the moment an alias rule changed.
- **`pricingSource` is READ BACK from the snapshot**, in
  `utilities/model-cost-catalog.utility.ts`. Order is load-bearing:
  `isFallbackRate` is checked FIRST, because a fallback snapshot is another
  model's row wearing this model's identity and every other field looks like a
  published price. Then `version === 0` (nothing was read — local compute or
  nothing), then a half-priced row, then a key mismatch (`DATED_FAMILY`).
- **Batched, not fired all at once.** `MODEL_COST_CATALOG_BATCH_SIZE = 16`:
  ~166 models × 1–3 queries would ask a CPU-sized Prisma pool for several
  hundred connections on the admin's first page load.
- Gated like `POST`, not like the public read: one response carries the whole
  provider rate card, and a rate is a margin input.

Money crosses the wire as `number` micro-USD. BigInt cannot be JSON-serialised;
`toModelCostSnapshot` is the single conversion boundary.

**An empty registry is an OPERATOR condition, not an empty price list.** The
catalogue is built from `RouterModelRegistry`, which is populated by model
DISCOVERY — not by configuring a connector. A production install ran with 0
registry rows, so this endpoint returned `[]`, the admin price page was blank,
and its copy said models "appear here once a connector has been synced", which
implies it happens by itself. Every paid model was unpriced and refused.
`listCatalog` now logs a warning naming `POST /routing/models/discovery/run`,
and the admin empty state links to `/models/discovery`.

Reached from the edge through `location /api/v1/router-models` in
`infra/nginx/locations.conf` (and the distributed template) — these controllers
mount at `router-models/*`, NOT under the `routing/*` prefix nginx already
proxied, so without that block the route 404s in Docker while working on
`localhost:4004`. `/api/v1/internal/router-models` stays unproxied on purpose.

## File requests in every mode (ADR-119)

- `dispatchByMode` runs `detectExplicitModeFileRequest` before every non-AUTO
  handler. A file request keeps its mode; MANUAL_MODEL adds `fileWriter` (the
  user's provider/model), published on `message.routed`.
- Skipped for Runtime V2 (`RoutingContext.runtimeV2`), for a manual image or
  file provider, and for MANUAL_MODEL without a model (AUTO detects itself).
- `detectFileIntent` is Unicode-aware (`Intl.Segmenter`) with create/delivery
  verbs, negations and the word "file" in all 13 UI locales. Ambiguous format
  names stay SOFT and only pdf/docx/xlsx/xls/pptx/csv count as a bare leading
  word — see rule 51 §9–12 before adding a word.

## Assistant model role VISION_HELPER (ADR-120 batch 5, 2026-09-25)

`AssistantModelRole.VISION_HELPER` names the vision models chat-service uses to
describe an attached image for a lane whose model cannot see. Admin-managed on
the Smart Router "Assistant models" tab like `RESEARCH_GATE` and `FILE_WRITER`
(rule 51 item 7: a helper model gets a role, never a constant).

- **Migration**: `20260925150000_add_vision_helper_role`
  (`ALTER TYPE "AssistantModelRole" ADD VALUE IF NOT EXISTS 'VISION_HELPER'`).
  Deploy it before the new image boots, or `seedOnce` fails on an unknown label.
- **Seed** (`assistant-model-seed.constants.ts`, fills the role only while it
  has no rows): `GEMINI gemini-2.5-flash` order 1, `OPENAI gpt-4.1-mini`
  order 2, both enabled, `timeoutMs` 30 000, `maxTokens` 1 024. chat-service
  skips any candidate the connector catalog does not mark vision-SUPPORTED, so
  an unconfigured provider is simply not tried.
- **Endpoints**: unchanged — `GET/PUT /routing/assistant-models/VISION_HELPER`
  (admin) and `GET /internal/assistant-models/VISION_HELPER/candidates`.
- Metering happens in chat-service (`PaygSurface.VISION_HELPER`), not here.
- Runbook: [`skills/add-a-helper-model-role.md`](../../skills/add-a-helper-model-role.md).

## AUTO ranks by modality fit (multimodal batch 8, rule 51 item 13)

chat-service sends `attachmentMimeTypes`, `requiredModalities` and
`transformableModalities` on `message.created`
(`parseAttachmentModality` validates: ≤ 10 mime types, known values only,
transformable ⊆ required). They land on `RoutingContext` and reach
`selectCloudRouterCandidates` through `CloudRouterEligibilityManager`.

- Fit per deployment (`modalityFitOf`, pure): `DIRECT` reads every required
  modality (definition `modalitiesIn`, synced from connector-service;
  `ModelDeployment.supportsVision` overrides for images) · `TRANSFORMED`
  misses only transformable ones · `DEGRADED` misses one chat cannot transform.
- Order: exposure/health/plan filters FIRST (unchanged), then tiers DIRECT →
  TRANSFORMED, each with the old round-robin (ACTIVE first, one model per
  provider). DEGRADED is offered only when nothing else survived — AUTO never
  goes dark. No attachments → every row DIRECT → identical order.
- The cloud router prompt gets an `ATTACHMENTS:` line and a fit note per
  candidate; the decision gets `modalityFit:direct|transformed|degraded` in
  `reasonTags`. `routerModel` provenance and the plan gate are untouched.
- Only the cloud-router path ranks by fit. The keyword capability router, the
  Ollama-assisted path and the heuristic fallback do not (chat still serves any
  model honestly — frames + transcript, OCR, transcript).
- `findRoutableForCloudRouting` now also selects `supportsVision` and
  `definition.modalitiesIn`.

## Image-generation model ids (2026-09-25)

`IMAGE_MODEL_OPENAI` in `src/modules/routing/constants/routing.constants.ts` is
`gpt-image-1` — `dall-e-3` is retired for new OpenAI keys and image-service no
longer runs it. It must match image-service's `IMAGE_MODEL_OPENAI`. The
`IMAGE_PROVIDER_OPENAI` rule in `provider-inference.constants.ts` lists
`gpt-image` / `chatgpt-image` and sits ahead of the chat `OPENAI` rule
(`startsWith: ['gpt']`), otherwise a manual `gpt-image-1` pick is inferred as a
chat model.

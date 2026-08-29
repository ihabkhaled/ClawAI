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

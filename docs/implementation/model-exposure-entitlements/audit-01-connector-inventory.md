# Audit 01 — Connector Inventory

Sources read: `apps/claw-connector-service/prisma/schema.prisma`, `apps/claw-connector-service/src/modules/connectors/types/connectors.types.ts`, `apps/claw-connector-service/src/modules/connectors/managers/models-snapshot.manager.ts`, `apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts`, `apps/claw-connector-service/src/modules/connectors/managers/adapters/gemini.adapter.ts`, `apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts`.

## 1. What ConnectorModel stores and its unique key

`ConnectorModel` (`apps/claw-connector-service/prisma/schema.prisma`, model `ConnectorModel`) stores per synced model:

- `id` (cuid primary key, generated)
- `connectorId` (foreign key to `Connector.id`, cascade delete)
- `provider` (enum `ConnectorProvider`: OPENAI, ANTHROPIC, GEMINI, AWS_BEDROCK, DEEPSEEK, OLLAMA, GROK, LLAMACPP)
- `modelKey` (string, mapped column `model_key`)
- `displayName` (string, mapped `display_name`)
- `lifecycle` (enum `ModelLifecycle`, default ACTIVE)
- `supportsStreaming`, `supportsTools`, `supportsVision`, `supportsAudio`, `supportsStructuredOutput` (Boolean, default false)
- `maxContextTokens` (Int?, mapped `max_context_tokens`)
- `usageTier` (enum `ModelUsageTier`, default UNKNOWN)
- `inputUsdPerMillion`, `cachedInputUsdPerMillion`, `outputUsdPerMillion` (Decimal?, 12,6)
- `syncedAt` (DateTime, default now, mapped `synced_at`)
- relation `connector` to `Connector`

The unique key is declared in the schema as:

```prisma
@@unique([connectorId, modelKey])
```

This composite key is scoped to a single connector. It distinguishes the same `modelKey` offered by two different connectors (different `connectorId` values), but it does **not** distinguish the same `modelKey` offered by two different providers if those happen to be under the same connector — which is not possible because each `Connector` has one `provider` (`apps/claw-connector-service/prisma/schema.prisma`, model `Connector`, field `provider ConnectorProvider`). Effectively provider is fixed per connector, so cross-provider collisions are prevented at the `Connector` level, not at the `ConnectorModel` key level. Two connectors with the same provider can each hold the same `modelKey` as separate rows.

## 2. What ModelSyncRun records about a sync

`ModelSyncRun` (`apps/claw-connector-service/prisma/schema.prisma`, model `ModelSyncRun`) records:

- `id` (cuid)
- `connectorId` (foreign key to `Connector.id`)
- `status` (enum `ModelSyncStatus`: RUNNING, COMPLETED, FAILED)
- `modelsFound` (Int, default 0, mapped `models_found`)
- `modelsAdded` (Int, default 0, mapped `models_added`)
- `modelsRemoved` (Int, default 0, mapped `models_removed`)
- `startedAt` (DateTime, default now, mapped `started_at`)
- `completedAt` (DateTime?, mapped `completed_at`)
- `errorMessage` (String?, mapped `error_message`)

The corresponding TypeScript shape is `CreateSyncRunData` / `SyncModelsResult` in `apps/claw-connector-service/src/modules/connectors/types/connectors.types.ts` (`SyncModelsResult` exposes `modelsFound`, `modelsAdded`, `modelsRemoved`).

## 3. NormalizedModel contents and what the Gemini adapter fills

`NormalizedModel` (`apps/claw-connector-service/src/modules/connectors/types/connectors.types.ts`) contains:

- `modelKey: string`
- `displayName: string`
- `lifecycle: ModelLifecycle`
- `capabilities: ModelCapabilities` with `supportsStreaming`, `supportsTools`, `supportsVision`, `supportsAudio`, `supportsStructuredOutput`, `maxContextTokens?`, and optional `toolEvidence?: ModelToolEvidence`
- `usage?: ModelUsageMetadata` with `tier: ModelUsageTier`, `inputUsdPerMillion`, `cachedInputUsdPerMillion`, `outputUsdPerMillion` (nullable)

The Gemini adapter (`apps/claw-connector-service/src/modules/connectors/managers/adapters/gemini.adapter.ts`, method `syncModels`) fills in:

- `modelKey: model.id`
- `displayName: GeminiAdapter.formatDisplayName(model.id)`
- `lifecycle: ModelLifecycle.ACTIVE`
- `capabilities.supportsStreaming: true`
- `capabilities.supportsTools: true`
- `capabilities.supportsVision: true`
- `capabilities.supportsAudio: true`
- `capabilities.supportsStructuredOutput: true`

It leaves empty: `capabilities.maxContextTokens` (not set), `capabilities.toolEvidence` (not set), and the entire `usage` object (not set, so `usage` is `undefined`; the repository falls back to `ModelUsageTier.UNKNOWN` for `usageTier` and `null` for the price columns in `apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts`, `upsertMany` and `replaceMany`).

## 4. How models-snapshot.manager.ts decides insert, update, or missing on re-sync

`apps/claw-connector-service/src/modules/connectors/managers/models-snapshot.manager.ts` does **not** itself decide insert/update/missing. It only reads existing `ConnectorModel` rows via `this.modelsRepo.findAllForSnapshot()` and maps them to snapshot entries in `build()`. The comment at the top states it builds the snapshot consumed by the routing-service's `RouterSyncManager` and returns only enabled connectors' ACTIVE models.

The actual insert/update/missing decision is in `ConnectorModelsRepository` (`apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts`). The decisive logic is in `replaceMany`, which first deletes rows whose `modelKey` is not in the incoming set, then upserts the rest:

```ts
this.prisma.connectorModel.deleteMany({
  where: {
    connectorId,
    ...(modelKeys.length > 0 ? { modelKey: { notIn: modelKeys } } : {}),
  },
}),
...uniqueModels.map((model) =>
  this.prisma.connectorModel.upsert({
    where: {
      connectorId_modelKey: { connectorId, modelKey: model.modelKey },
    },
    update: { ... syncedAt: new Date() },
    create: { ... },
  }),
),
```

Decisive lines: the `deleteMany` with `modelKey: { notIn: modelKeys }` marks a model missing by deleting it; the `upsert` on `connectorId_modelKey` either updates an existing row or creates a new one. `upsertMany` is a separate path that only upserts and never deletes.

## 5. Controller routes exposing sync and model listing

`apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts`, class `ConnectorsController`, `@Controller('connectors')`:

- `@Post(':id/sync')` — `sync(@Param('id') id)` → `connectorsService.syncModels(id)`, permission `Permission.ADMIN_CONNECTORS_MANAGE`
- `@Get(':id/models')` — `getModels(@Param('id') id)` → `connectorsService.getModels(id)`, no `@RequirePermissions` decorator on this method
- `@Get('available-models')` — `getAvailableModels()` → `connectorsService.getAvailableModels()`, permission `Permission.MODEL_USE_ALLOWED` (user-facing catalog; comment notes it must stay above `@Get(':id')`)
- `@Post(':id/models/:modelKey/probe-tools')` — `probeTools(id, modelKey)` → `connectorsService.probeModelToolCapability(id, modelKey)`, permission `Permission.ADMIN_CONNECTORS_MANAGE`

## 6. Whether a newly synced model becomes usable by users automatically

No. A newly synced `ConnectorModel` row becomes part of the snapshot only if its `connector.isEnabled` is true and its `lifecycle` is `ACTIVE` (`apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts`, `findAllForSnapshot`, `where: { connector: { isEnabled: true }, lifecycle: 'ACTIVE' }`), and `getAvailableModels()` is the only user-facing route with `Permission.MODEL_USE_ALLOWED` (`apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts`, `getAvailableModels`); plan entitlements in auth-service are a separate free-string layer (see section 7), so sync alone does not make a model usable.

## 7. Cross-service gap: PlanModelAccess free strings vs ConnectorModel inventory

`PlanModelAccess` in `apps/claw-auth-service/prisma/schema.prisma` stores `provider` and `model` as plain `String` columns with `@@unique([planId, provider, model])` and no relation to `ConnectorModel`, which is the real inventory in `apps/claw-connector-service/prisma/schema.prisma`. Nothing in the six read files validates that a `PlanModelAccess.provider`/`model` pair corresponds to an existing `ConnectorModel`; the connector-service has no reference to `PlanModelAccess`. The validation that would stop an operator from assigning a model that was never synced would have to live in the auth-service, where `PlanModelAccess` is defined — i.e., `apps/claw-auth-service/prisma/schema.prisma` (or a service module in `apps/claw-auth-service/src/` that was not read in this audit, so UNVERIFIED beyond the schema).

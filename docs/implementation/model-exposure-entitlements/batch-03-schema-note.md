# Batch 03 — Connector-Service Schema Changes

Schema (`apps/claw-connector-service/prisma/schema.prisma`) and migration
(`migrations/20260822232000_add_model_exposure_and_kind/migration.sql`) received
three additive changes. No other service schema was touched.

1. `REMOVED` added to `ModelLifecycle` — models that vanish from a provider sync are
   retained with `lifecycle = REMOVED` instead of being deleted.
2. Two new enums: `ModelExposure { UNEXPOSED, EXPOSED }` and
   `ModelKind { CHAT, EMBEDDING, RERANKER, TOOL }`.
3. Three new columns on `ConnectorModel`: `exposure` (default `UNEXPOSED`),
   `kind` (default `CHAT`), and `last_seen_at` (nullable). A `@@index([exposure])`
   was added; the migration creates `connector_models_exposure_idx`.

`exposure` defaults to `UNEXPOSED` so models already synced do not silently become
user-visible; exposure is an opt-in decision set deliberately.

The auth-service schema was not touched. `PlanModelAccess` lives in a different
service database, so a cross-database foreign key is not possible here.

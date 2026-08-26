-- Additive: new enum values, two new enums, three new columns, one new index.
-- Every existing row keeps working because both new NOT NULL columns carry defaults.
-- UNEXPOSED is deliberately the default so models already synced do not silently become user-visible.

ALTER TYPE "ModelLifecycle" ADD VALUE IF NOT EXISTS 'REMOVED';

CREATE TYPE "ModelExposure" AS ENUM ('UNEXPOSED', 'EXPOSED');

CREATE TYPE "ModelKind" AS ENUM ('CHAT', 'EMBEDDING', 'RERANKER', 'TOOL');

ALTER TABLE "connector_models"
ADD COLUMN "exposure" "ModelExposure" NOT NULL DEFAULT 'UNEXPOSED',
ADD COLUMN "kind" "ModelKind" NOT NULL DEFAULT 'CHAT',
ADD COLUMN "last_seen_at" TIMESTAMP(3);

CREATE INDEX "connector_models_exposure_idx" ON "connector_models"("exposure");
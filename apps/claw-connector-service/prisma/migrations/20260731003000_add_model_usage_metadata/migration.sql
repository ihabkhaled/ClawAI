CREATE TYPE "ModelUsageTier" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'EXTRA_HIGH');

ALTER TABLE "connector_models"
ADD COLUMN "usage_tier" "ModelUsageTier" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "input_usd_per_million" DECIMAL(12,6),
ADD COLUMN "cached_input_usd_per_million" DECIMAL(12,6),
ADD COLUMN "output_usd_per_million" DECIMAL(12,6);

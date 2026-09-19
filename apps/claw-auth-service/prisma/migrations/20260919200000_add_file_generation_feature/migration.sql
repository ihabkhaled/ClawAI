-- F3d (ADR-110): AI-written files become a metered plan feature.
-- The value is added in its own migration: Postgres cannot use a new enum
-- value inside the transaction that added it.
ALTER TYPE "PlanFeatureKey" ADD VALUE IF NOT EXISTS 'FILE_GENERATION';

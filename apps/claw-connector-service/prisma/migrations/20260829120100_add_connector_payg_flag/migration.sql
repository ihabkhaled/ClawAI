-- Adds the PAYG classification flag to connectors, and backfills it for the
-- providers that bill ClawAI real money today.
--
-- WHY THE BACKFILL LIVES IN THE MIGRATION AND NOT IN A SEEDER.
-- connector-service has no seed infrastructure at all: no `prisma/seed.js`, no
-- `SeedExecution` model, no `prisma.seed` entry in package.json, and
-- `tools/release/seed-versioned.mjs` skips this service entirely. A seeder here
-- would be a file nothing ever runs, which is worse than no seeder: the column
-- would ship defaulted to false, every paid provider would be classified free,
-- and the wallet would meter nothing on day one.
--
-- `false` is the safe default for the column (an unknown provider is free until
-- an operator says otherwise), so the UPDATE below is the one place that turns
-- metering on, and it does so only for providers already known to cost money.

ALTER TABLE "connectors" ADD COLUMN "is_pay_as_you_go" BOOLEAN NOT NULL DEFAULT false;

-- Mirrors PAYG_DEFAULT_PROVIDERS in
-- packages/shared-constants/src/payg-credit.constants.ts. That constant is the
-- DEFAULT, not the runtime authority — after this migration the column is, and
-- the admin toggle on PATCH /connectors/:id is the lever that changes it.
--
-- OLLAMA is deliberately absent, and stays false even for Ollama-Cloud
-- connectors, which DO cost money upstream. That is a product decision recorded
-- in ADR-082, not an oversight: the classification grain is the provider, an
-- Ollama-Cloud connector is indistinguishable from a self-hosted Ollama
-- connector at that grain, and defaulting the pair to metered would start
-- charging users for inference running on their own hardware. An operator who
-- runs Ollama Cloud flips the connector's toggle. LLAMACPP is absent for the
-- same reason and has no cloud variant at all.
UPDATE "connectors" SET "is_pay_as_you_go" = true
 WHERE "provider" IN ('OPENAI','ANTHROPIC','GEMINI','DEEPSEEK','GROK','AWS_BEDROCK');

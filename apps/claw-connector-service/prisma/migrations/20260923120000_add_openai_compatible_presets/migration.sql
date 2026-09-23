-- OpenAI-compatible connector presets (ADR-117).
--
-- Each preset is an explicit enum value so routing, cost rows, PAYG policy and
-- judge parsing keep keying on the provider name. ADD VALUE is additive and
-- safe inside the migration transaction (PostgreSQL >= 12) because nothing in
-- this migration uses the new values.
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'OPENROUTER';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'GROQ';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'CEREBRAS';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'SAMBANOVA';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'DEEPINFRA';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'FIREWORKS';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'TOGETHER';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'MISTRAL';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'MOONSHOT';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'ZAI';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'QWEN';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'CLOUDFLARE';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'VERCEL_AI_GATEWAY';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'PERPLEXITY';
ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'COHERE';

-- Cloudflare Workers AI scopes its URLs to an account id. Nullable: only that
-- preset needs it, and every existing connector must keep working untouched.
ALTER TABLE "connectors" ADD COLUMN "account_id" TEXT;

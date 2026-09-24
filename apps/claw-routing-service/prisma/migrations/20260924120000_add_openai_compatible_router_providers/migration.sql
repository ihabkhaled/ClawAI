-- Connector presets batch 2 (ADR-116/117): the 15 OpenAI-compatible
-- providers connector-service already accepts (migration
-- 20260923120000_add_openai_compatible_presets in claw-connector-service)
-- were never mirrored into RouterProvider, so routing-service's model
-- discovery had no enum value to write a deployment row under and every
-- one of these providers was silently unroutable. ADD VALUE is additive and
-- safe inside the migration transaction (PostgreSQL >= 12) because nothing
-- in this migration uses the new values.
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'OPENROUTER';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'GROQ';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'CEREBRAS';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'SAMBANOVA';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'DEEPINFRA';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'FIREWORKS';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'TOGETHER';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'MISTRAL';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'MOONSHOT';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'ZAI';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'QWEN';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'CLOUDFLARE';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'VERCEL_AI_GATEWAY';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'PERPLEXITY';
ALTER TYPE "RouterProvider" ADD VALUE IF NOT EXISTS 'COHERE';

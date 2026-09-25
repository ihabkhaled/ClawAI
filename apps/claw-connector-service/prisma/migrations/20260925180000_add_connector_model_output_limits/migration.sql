-- Per-model output ceiling (ADR-125).
--
-- `max_output_tokens` is what the provider's catalog publishes at sync time
-- (OpenRouter `top_provider.max_completion_tokens`, Groq
-- `max_completion_tokens`); a resync overwrites it.
--
-- `learned_max_output_tokens` is what chat-service learned from a provider
-- refusing a `max_tokens` ("must be less than or equal to 16384", "exceeds
-- model's maximum output tokens (16384)"). A sync never touches it, and it only
-- ever moves DOWN, so one bad parse cannot widen a model's cap.
--
-- Both nullable: NULL = unknown, not unlimited. No backfill: the next sync and
-- the next refusal fill them.
ALTER TABLE "connector_models" ADD COLUMN "max_output_tokens" INTEGER;
ALTER TABLE "connector_models" ADD COLUMN "learned_max_output_tokens" INTEGER;
ALTER TABLE "connector_models" ADD COLUMN "learned_max_output_at" TIMESTAMP(3);

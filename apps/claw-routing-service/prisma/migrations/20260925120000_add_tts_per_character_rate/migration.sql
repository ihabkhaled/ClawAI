-- Unit metering: a per-CHARACTER rate for text-to-speech models, beside the
-- existing per-image and per-second-of-audio columns. Nullable and additive:
-- every existing row keeps NULL ("not published"), which prices the unit at
-- zero and changes no existing charge. Rows are never updated in place; a new
-- price is a new ModelCostVersion row.
ALTER TABLE "model_cost_versions" ADD COLUMN IF NOT EXISTS "tts_per_character_micro_usd" BIGINT;

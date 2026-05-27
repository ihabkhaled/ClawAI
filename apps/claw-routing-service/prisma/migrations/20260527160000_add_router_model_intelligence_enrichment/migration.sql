-- Semantic Router Flagship — Phase 3
-- Enriches `router_model_registry` with the full RouterModelIntelligence
-- shape described in §6.1 of the flagship prompt. Every column is
-- additive, nullable, and default-falsy so the v1 hot path is unaffected.
--
-- Capability flags use NULLABLE BOOLEAN: NULL = unknown, FALSE = known-not-
-- supported, TRUE = supported. The Phase 4 AI Route Planner treats NULL as
-- "do not assume; do not select for high-risk".
--
-- `admin_override_json` is the freeze block — sync passes MUST NOT overwrite
-- any key present here. See ModelIntelligenceService.applyOverrides().

-- Capability flags (defaults to FALSE for the existing rows that ALREADY had
-- inferable defaults; new rows MAY be created with NULL to mean "unknown").
ALTER TABLE "router_model_registry"
  ADD COLUMN IF NOT EXISTS "supports_streaming"          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_tools"              BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_structured_output"  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_vision"             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_audio_input"        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_audio_output"       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_video_input"        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_file_input"         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_embeddings"         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_long_context"       BOOLEAN DEFAULT false;

-- Token ceilings as exposed by upstream cards.
ALTER TABLE "router_model_registry"
  ADD COLUMN IF NOT EXISTS "max_context_tokens"        INTEGER,
  ADD COLUMN IF NOT EXISTS "max_output_tokens_intel"   INTEGER;

-- Domain / role guidance.
ALTER TABLE "router_model_registry"
  ADD COLUMN IF NOT EXISTS "domain_strengths"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "role_strengths"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "weak_domains"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "best_for"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "avoid_for"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "language_strengths"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Quality / cost / latency / privacy LABELS (separate from the typed enum
-- columns above so the planner can apply free-form overrides without
-- migrating the canonical enums).
ALTER TABLE "router_model_registry"
  ADD COLUMN IF NOT EXISTS "quality_tier_label"          TEXT,
  ADD COLUMN IF NOT EXISTS "cost_class_label"            TEXT,
  ADD COLUMN IF NOT EXISTS "cost_confidence_label"       TEXT,
  ADD COLUMN IF NOT EXISTS "estimated_input_cost_per_1m"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "estimated_output_cost_per_1m" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "latency_class_label"         TEXT,
  ADD COLUMN IF NOT EXISTS "privacy_class_label"         TEXT;

-- Override freeze block + last enrichment timestamp.
ALTER TABLE "router_model_registry"
  ADD COLUMN IF NOT EXISTS "admin_override_json" JSONB,
  ADD COLUMN IF NOT EXISTS "last_enriched_at"    TIMESTAMP(3);

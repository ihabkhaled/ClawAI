-- Smart Router Flagship — Phase 1: Model Intelligence Registry
-- Additive only. Existing tables (router_model_profiles = learned-metrics
-- table; router_topic_profiles; routing_calibration_snapshots) are not
-- modified by this migration.

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE "ModelLifecycle" AS ENUM ('ACTIVE', 'PREVIEW', 'DEPRECATED', 'DISABLED', 'REMOVED');
CREATE TYPE "CostConfidence" AS ENUM ('EXACT', 'ESTIMATED', 'UNKNOWN');
CREATE TYPE "CostClass" AS ENUM ('FREE', 'CHEAP', 'STANDARD', 'PREMIUM', 'ULTRA');
CREATE TYPE "LatencyClass" AS ENUM ('REALTIME', 'FAST', 'MEDIUM', 'SLOW', 'HEAVY');
CREATE TYPE "QualityTier" AS ENUM ('S', 'A', 'B', 'C', 'D');
CREATE TYPE "PrivacyClass" AS ENUM ('PUBLIC_OK', 'CLOUD_PERMITTED', 'LOCAL_PREFERRED', 'LOCAL_ONLY');
CREATE TYPE "ModalityKind" AS ENUM (
  'TEXT', 'CODE',
  'IMAGE_INPUT', 'IMAGE_OUTPUT',
  'AUDIO_INPUT', 'AUDIO_OUTPUT',
  'VIDEO_INPUT', 'VIDEO_OUTPUT',
  'FILE_INPUT', 'PDF_INPUT', 'SPREADSHEET_INPUT',
  'WEB_INPUT', 'YOUTUBE_INPUT',
  'STRUCTURED_OUTPUT', 'TOOL_CALLING', 'STREAMING', 'EMBEDDING'
);
CREATE TYPE "DomainTag" AS ENUM (
  'GENERAL', 'CODING', 'MEDICAL', 'LEGAL', 'FINANCE',
  'MARKETING', 'EDUCATION', 'CREATIVE_WRITING', 'RESEARCH',
  'MECHANICAL', 'AUTOMOTIVE', 'BIOLOGY', 'CHEMISTRY', 'PHYSICS',
  'MULTIMEDIA', 'BUSINESS', 'HR', 'SALES', 'TRANSLATION',
  'MENTAL_HEALTH', 'LITERATURE'
);

-- ─── router_model_registry ──────────────────────────────────

CREATE TABLE "router_model_registry" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model_key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "family" TEXT,
  "connector_id" TEXT,
  "runtime_id" TEXT,
  "is_local" BOOLEAN NOT NULL DEFAULT false,
  "is_router_only" BOOLEAN NOT NULL DEFAULT false,
  "is_execution_capable" BOOLEAN NOT NULL DEFAULT true,
  "lifecycle" "ModelLifecycle" NOT NULL DEFAULT 'ACTIVE',
  "modalities_in" "ModalityKind"[] NOT NULL DEFAULT ARRAY[]::"ModalityKind"[],
  "modalities_out" "ModalityKind"[] NOT NULL DEFAULT ARRAY[]::"ModalityKind"[],
  "context_window_tokens" INTEGER,
  "max_output_tokens" INTEGER,
  "domain_tags" "DomainTag"[] NOT NULL DEFAULT ARRAY[]::"DomainTag"[],
  "not_recommended_for" "DomainTag"[] NOT NULL DEFAULT ARRAY[]::"DomainTag"[],
  "input_cost_per_1m" DECIMAL(12,6),
  "output_cost_per_1m" DECIMAL(12,6),
  "cost_confidence" "CostConfidence" NOT NULL DEFAULT 'UNKNOWN',
  "cost_class" "CostClass",
  "latency_p50_ms" INTEGER,
  "latency_p95_ms" INTEGER,
  "latency_class" "LatencyClass",
  "quality_tier" "QualityTier" NOT NULL DEFAULT 'B',
  "hallucination_risk" DECIMAL(4,3),
  "judge_suitability" BOOLEAN NOT NULL DEFAULT false,
  "search_suitability" BOOLEAN NOT NULL DEFAULT false,
  "fallback_suitability" BOOLEAN NOT NULL DEFAULT true,
  "privacy_support" "PrivacyClass" NOT NULL DEFAULT 'CLOUD_PERMITTED',
  "metadata_source" TEXT NOT NULL DEFAULT 'seed',
  "external_card_url" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_synced_at" TIMESTAMP(3),

  CONSTRAINT "router_model_registry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "router_model_registry_provider_model_key_key"
  ON "router_model_registry"("provider", "model_key");
CREATE INDEX "router_model_registry_provider_idx"
  ON "router_model_registry"("provider");
CREATE INDEX "router_model_registry_lifecycle_idx"
  ON "router_model_registry"("lifecycle");
CREATE INDEX "router_model_registry_is_execution_capable_lifecycle_idx"
  ON "router_model_registry"("is_execution_capable", "lifecycle");
CREATE INDEX "router_model_registry_is_router_only_idx"
  ON "router_model_registry"("is_router_only");

-- ─── router_admin_overrides ─────────────────────────────────

CREATE TABLE "router_admin_overrides" (
  "id" TEXT NOT NULL,
  "profile_id" TEXT NOT NULL,
  "field_name" TEXT NOT NULL,
  "field_value" JSONB NOT NULL,
  "reason" TEXT,
  "set_by" TEXT NOT NULL,
  "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "router_admin_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "router_admin_overrides_profile_id_field_name_key"
  ON "router_admin_overrides"("profile_id", "field_name");
CREATE INDEX "router_admin_overrides_profile_id_idx"
  ON "router_admin_overrides"("profile_id");
CREATE INDEX "router_admin_overrides_is_active_idx"
  ON "router_admin_overrides"("is_active");

ALTER TABLE "router_admin_overrides"
  ADD CONSTRAINT "router_admin_overrides_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "router_model_registry"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

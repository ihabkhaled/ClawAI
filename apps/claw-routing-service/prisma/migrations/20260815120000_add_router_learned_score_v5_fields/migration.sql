-- Cloud Smart Router — Batch 11, Learning Evolution V5 ("Learned scores")
-- ADR-069: RouterModelProfile / RouterTopicProfile (via RouterEducationManager)
-- is the one production learned-score system; RouterLearnedScore stays
-- dead-but-harmless and is untouched by this migration.
--
-- Every column below is additive, nullable (or default-falsy), so existing
-- rows read as "no version / no interval / no evaluator recorded yet" rather
-- than a fabricated value. No table is dropped, no column is renamed or
-- narrowed, no NOT NULL is added without a default.

-- Raw observation: evaluator/rubric attribution (V5 "evaluator attribution").
-- Nullable — most existing rows predate any judge run reporting a version.
ALTER TABLE "routing_outcome_records"
  ADD COLUMN IF NOT EXISTS "evaluator_version" TEXT;

-- Aggregate: versioned scores, confidence interval, evaluator attribution
-- rollup (V5 "confidence intervals" + "evaluator attribution" + "versioned
-- ... scores").
ALTER TABLE "router_model_profiles"
  ADD COLUMN IF NOT EXISTS "score_version"             TEXT,
  ADD COLUMN IF NOT EXISTS "success_rate_lower_bound"  DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "success_rate_upper_bound"  DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "evaluator_versions"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX IF NOT EXISTS "router_model_profiles_score_version_idx" ON "router_model_profiles"("score_version");

ALTER TABLE "router_topic_profiles"
  ADD COLUMN IF NOT EXISTS "score_version"             TEXT,
  ADD COLUMN IF NOT EXISTS "success_rate_lower_bound"  DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "success_rate_upper_bound"  DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "evaluator_versions"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX IF NOT EXISTS "router_topic_profiles_score_version_idx" ON "router_topic_profiles"("score_version");

-- Snapshot: batch recalibration first, rollback (V5 "batch recalibration
-- first, and rollback"). Full point-in-time copy of the profile rows this
-- snapshot produced, written before those rows are promoted to the live
-- tables above. Pre-ADR-069 snapshot rows have neither column populated.
ALTER TABLE "routing_calibration_snapshots"
  ADD COLUMN IF NOT EXISTS "model_profiles" JSONB,
  ADD COLUMN IF NOT EXISTS "topic_profiles" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "routing_calibration_snapshots_version_idx" ON "routing_calibration_snapshots"("version");

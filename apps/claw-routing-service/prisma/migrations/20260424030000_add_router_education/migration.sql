-- Enums
CREATE TYPE "FeedbackValue" AS ENUM ('POSITIVE', 'NEGATIVE');
CREATE TYPE "RoutingExecutionStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'DEGRADED', 'NO_EXECUTION_MODEL');
CREATE TYPE "JudgeOutcome" AS ENUM ('VERIFIED', 'REVISED', 'ESCALATED', 'UNAVAILABLE', 'NONE');

-- Routing decision education fields
ALTER TABLE "routing_decisions"
ADD COLUMN "detected_category" TEXT,
ADD COLUMN "secondary_category" TEXT,
ADD COLUMN "match_count" INTEGER,
ADD COLUMN "selected_execution_path" TEXT,
ADD COLUMN "route_roadmap" JSONB,
ADD COLUMN "model_inventory_snapshot" JSONB,
ADD COLUMN "connector_health_snapshot" JSONB,
ADD COLUMN "capability_match_score" DECIMAL(5,4),
ADD COLUMN "latency_score" DECIMAL(5,4),
ADD COLUMN "risk_score" DECIMAL(5,4),
ADD COLUMN "uncertainty_score" DECIMAL(5,4);

-- Outcome records
CREATE TABLE "routing_outcome_records" (
  "id" TEXT NOT NULL,
  "routing_decision_id" TEXT NOT NULL,
  "message_id" TEXT,
  "assistant_message_id" TEXT,
  "thread_id" TEXT NOT NULL,
  "final_execution_provider" TEXT NOT NULL,
  "final_execution_model" TEXT NOT NULL,
  "execution_status" "RoutingExecutionStatus" NOT NULL,
  "execution_success" BOOLEAN NOT NULL DEFAULT true,
  "actual_latency_ms" INTEGER,
  "actual_cost_estimate" DECIMAL(12,8),
  "final_status" TEXT NOT NULL DEFAULT 'completed',
  "fallback_used" BOOLEAN NOT NULL DEFAULT false,
  "judge_outcome" "JudgeOutcome" NOT NULL DEFAULT 'NONE',
  "judge_confidence" DECIMAL(5,4),
  "critic_score" DECIMAL(5,4),
  "issue_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "revised" BOOLEAN NOT NULL DEFAULT false,
  "escalated" BOOLEAN NOT NULL DEFAULT false,
  "follow_up_signal" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "routing_outcome_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "routing_outcome_records_routing_decision_id_key"
ON "routing_outcome_records"("routing_decision_id");
CREATE INDEX "routing_outcome_records_thread_id_idx" ON "routing_outcome_records"("thread_id");
CREATE INDEX "routing_outcome_records_execution_status_idx" ON "routing_outcome_records"("execution_status");
CREATE INDEX "routing_outcome_records_judge_outcome_idx" ON "routing_outcome_records"("judge_outcome");

ALTER TABLE "routing_outcome_records"
ADD CONSTRAINT "routing_outcome_records_routing_decision_id_fkey"
FOREIGN KEY ("routing_decision_id") REFERENCES "routing_decisions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Feedback records
CREATE TABLE "routing_feedback_records" (
  "id" TEXT NOT NULL,
  "routing_decision_id" TEXT,
  "message_id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "assistant_message_id" TEXT,
  "feedback_value" "FeedbackValue" NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'thumbs',
  "weight" DECIMAL(6,4) NOT NULL DEFAULT 1.0,
  "task_family" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "routing_feedback_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "routing_feedback_records_routing_decision_id_idx" ON "routing_feedback_records"("routing_decision_id");
CREATE INDEX "routing_feedback_records_thread_id_idx" ON "routing_feedback_records"("thread_id");
CREATE INDEX "routing_feedback_records_feedback_value_idx" ON "routing_feedback_records"("feedback_value");

ALTER TABLE "routing_feedback_records"
ADD CONSTRAINT "routing_feedback_records_routing_decision_id_fkey"
FOREIGN KEY ("routing_decision_id") REFERENCES "routing_decisions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Materialized learning profiles
CREATE TABLE "router_model_profiles" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "task_family" TEXT NOT NULL,
  "topic_key" TEXT NOT NULL,
  "route_count" INTEGER NOT NULL DEFAULT 0,
  "success_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "thumbs_up_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "thumbs_down_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "judge_verified_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "judge_revised_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "judge_escalated_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "average_latency_ms" INTEGER NOT NULL DEFAULT 0,
  "average_cost_estimate" DECIMAL(12,8) NOT NULL DEFAULT 0,
  "fallback_success_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "hallucination_risk_score" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "calibration_trust_score" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "weighted_success_score" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "weighted_dissatisfaction_score" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "sample_size" INTEGER NOT NULL DEFAULT 0,
  "confidence_in_profile" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "router_model_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "router_model_profiles_provider_model_task_family_topic_key_key"
ON "router_model_profiles"("provider", "model", "task_family", "topic_key");
CREATE INDEX "router_model_profiles_task_family_topic_key_idx"
ON "router_model_profiles"("task_family", "topic_key");
CREATE INDEX "router_model_profiles_weighted_success_score_idx"
ON "router_model_profiles"("weighted_success_score");

CREATE TABLE "router_topic_profiles" (
  "id" TEXT NOT NULL,
  "task_family" TEXT NOT NULL,
  "topic_key" TEXT NOT NULL,
  "best_provider" TEXT,
  "best_model" TEXT,
  "route_count" INTEGER NOT NULL DEFAULT 0,
  "success_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "thumbs_up_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "thumbs_down_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "judge_verified_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "judge_escalated_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "fallback_success_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "weighted_success_score" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "ambiguity_score" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "confidence_in_profile" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "router_topic_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "router_topic_profiles_task_family_topic_key_key"
ON "router_topic_profiles"("task_family", "topic_key");
CREATE INDEX "router_topic_profiles_weighted_success_score_idx"
ON "router_topic_profiles"("weighted_success_score");

CREATE TABLE "routing_calibration_snapshots" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "window_days" INTEGER NOT NULL,
  "summary" JSONB NOT NULL,
  "prompt_hints" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "routing_calibration_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "routing_calibration_snapshots_generated_at_idx"
ON "routing_calibration_snapshots"("generated_at");
CREATE INDEX "routing_calibration_snapshots_active_idx"
ON "routing_calibration_snapshots"("active");

CREATE INDEX "routing_decisions_selected_provider_selected_model_idx"
ON "routing_decisions"("selected_provider", "selected_model");
CREATE INDEX "routing_decisions_detected_category_idx"
ON "routing_decisions"("detected_category");

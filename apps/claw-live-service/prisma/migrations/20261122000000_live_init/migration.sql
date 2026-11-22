-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LiveSourceKind" AS ENUM ('YOUTUBE', 'HLS', 'FIXTURE');

-- CreateEnum
CREATE TYPE "LiveCapability" AS ENUM ('PLAYER_ONLY', 'AUDIO', 'AUDIO_VISION');

-- CreateEnum
CREATE TYPE "LiveMode" AS ENUM ('AUDIO', 'AUDIO_VISION', 'SMART_AUTO');

-- CreateEnum
CREATE TYPE "LiveRunStatus" AS ENUM ('PENDING', 'ACTIVE', 'DELAYED', 'STOPPING', 'STOPPED', 'ENDED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "LiveSessionState" AS ENUM ('CONNECTING', 'ACTIVE', 'PAUSED', 'CREDITS_REQUIRED', 'GRACE', 'EXHAUSTED', 'UNSUPPORTED', 'DETACHED');

-- CreateEnum
CREATE TYPE "LiveFeedEventKind" AS ENUM ('SUMMARY', 'HIGHLIGHT', 'VISUAL', 'GAP', 'FINAL');

-- CreateEnum
CREATE TYPE "LiveHighlightType" AS ENUM ('DECISION', 'ANNOUNCEMENT', 'DEMONSTRATION', 'KEY_STATEMENT', 'QUESTION', 'MILESTONE', 'OTHER');

-- CreateEnum
CREATE TYPE "LiveTranslationTarget" AS ENUM ('SEGMENT', 'EVENT');

-- CreateEnum
CREATE TYPE "LiveChargeKind" AS ENUM ('FREE', 'PAID', 'GRACE', 'VISION', 'ENHANCEMENT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "LivePipelineStage" AS ENUM ('STT', 'SUMMARY', 'TRANSLATION', 'VISION', 'ENHANCEMENT');

-- CreateTable
CREATE TABLE "live_streams" (
    "id" TEXT NOT NULL,
    "source_kind" "LiveSourceKind" NOT NULL,
    "source_identity" TEXT NOT NULL,
    "access_scope" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "declared_host" TEXT,
    "capability" "LiveCapability" NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_processing_runs" (
    "id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "processing_key" TEXT NOT NULL,
    "active_key" TEXT,
    "mode" "LiveMode" NOT NULL,
    "pipeline_version" INTEGER NOT NULL,
    "status" "LiveRunStatus" NOT NULL DEFAULT 'PENDING',
    "generation" INTEGER NOT NULL DEFAULT 0,
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "checkpoint_at" BIGINT,
    "next_segment_seq" INTEGER NOT NULL DEFAULT 0,
    "last_commit_at" TIMESTAMP(3),
    "failure_code" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_processing_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_transcript_segments" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "start_at" BIGINT NOT NULL,
    "end_at" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT,
    "confidence" DOUBLE PRECISION,
    "uncertain" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_feed_events" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "kind" "LiveFeedEventKind" NOT NULL,
    "highlight_type" "LiveHighlightType",
    "topic_key" TEXT,
    "start_at" BIGINT NOT NULL,
    "end_at" BIGINT,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_feed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_feed_event_versions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_feed_event_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_translations" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "target_kind" "LiveTranslationTarget" NOT NULL,
    "target_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "source_version" INTEGER NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_memory_snapshots" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "up_to_at" BIGINT NOT NULL,
    "summary" TEXT NOT NULL,
    "key_facts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_memory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_viewer_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "run_id" TEXT,
    "language" TEXT NOT NULL,
    "mode" "LiveMode" NOT NULL,
    "state" "LiveSessionState" NOT NULL DEFAULT 'CONNECTING',
    "rights_attested_at" TIMESTAMP(3),
    "paid_approved_at" TIMESTAMP(3),
    "spending_cap_micro_usd" BIGINT,
    "spent_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "pending_seconds" INTEGER NOT NULL DEFAULT 0,
    "billed_seconds" INTEGER NOT NULL DEFAULT 0,
    "next_block_index" INTEGER NOT NULL DEFAULT 0,
    "last_heartbeat_at" TIMESTAMP(3),
    "last_playback_at" BIGINT,
    "policy_version" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detached_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_viewer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_session_coverage" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "from_at" BIGINT NOT NULL,
    "to_at" BIGINT NOT NULL,
    "ends_in_gap" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_session_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_enhancements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL,
    "model_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "cost_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "request_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_enhancements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_usage_months" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "free_seconds_used" INTEGER NOT NULL DEFAULT 0,
    "paid_seconds" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_usage_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_usage_charges" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT,
    "run_id" TEXT,
    "kind" "LiveChargeKind" NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "micro_usd" BIGINT NOT NULL DEFAULT 0,
    "reservation_id" TEXT,
    "policy_version" INTEGER NOT NULL,
    "corrects_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_usage_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_billing_states" (
    "user_id" TEXT NOT NULL,
    "grace_started_at" TIMESTAMP(3),
    "grace_consumed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_billing_states_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "live_provider_costs" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "run_id" TEXT,
    "stage" "LivePipelineStage" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "units" INTEGER NOT NULL DEFAULT 0,
    "cost_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "succeeded" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_provider_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_policy_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active_key" TEXT,
    "config" JSONB NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_run_tombstones" (
    "run_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_run_tombstones_pkey" PRIMARY KEY ("run_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_streams_source_identity_access_scope_key" ON "live_streams"("source_identity", "access_scope");

-- CreateIndex
CREATE UNIQUE INDEX "live_processing_runs_active_key_key" ON "live_processing_runs"("active_key");

-- CreateIndex
CREATE INDEX "live_processing_runs_status_lease_expires_at_idx" ON "live_processing_runs"("status", "lease_expires_at");

-- CreateIndex
CREATE INDEX "live_processing_runs_stream_id_created_at_idx" ON "live_processing_runs"("stream_id", "created_at");

-- CreateIndex
CREATE INDEX "live_transcript_segments_run_id_start_at_idx" ON "live_transcript_segments"("run_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "live_transcript_segments_run_id_seq_key" ON "live_transcript_segments"("run_id", "seq");

-- CreateIndex
CREATE INDEX "live_feed_events_run_id_start_at_idx" ON "live_feed_events"("run_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "live_feed_events_run_id_event_key_key" ON "live_feed_events"("run_id", "event_key");

-- CreateIndex
CREATE UNIQUE INDEX "live_feed_event_versions_event_id_version_key" ON "live_feed_event_versions"("event_id", "version");

-- CreateIndex
CREATE INDEX "live_translations_run_id_idx" ON "live_translations"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "live_translations_target_kind_target_id_language_source_ver_key" ON "live_translations"("target_kind", "target_id", "language", "source_version");

-- CreateIndex
CREATE INDEX "live_memory_snapshots_run_id_up_to_at_idx" ON "live_memory_snapshots"("run_id", "up_to_at");

-- CreateIndex
CREATE INDEX "live_viewer_sessions_user_id_created_at_id_idx" ON "live_viewer_sessions"("user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "live_viewer_sessions_run_id_state_idx" ON "live_viewer_sessions"("run_id", "state");

-- CreateIndex
CREATE INDEX "live_session_coverage_session_id_from_at_idx" ON "live_session_coverage"("session_id", "from_at");

-- CreateIndex
CREATE INDEX "live_session_coverage_run_id_idx" ON "live_session_coverage"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "live_enhancements_request_id_key" ON "live_enhancements"("request_id");

-- CreateIndex
CREATE INDEX "live_enhancements_user_id_created_at_idx" ON "live_enhancements"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "live_usage_months_user_id_month_key" ON "live_usage_months"("user_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "live_usage_charges_idempotency_key_key" ON "live_usage_charges"("idempotency_key");

-- CreateIndex
CREATE INDEX "live_usage_charges_user_id_created_at_idx" ON "live_usage_charges"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "live_usage_charges_created_at_idx" ON "live_usage_charges"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "live_provider_costs_idempotency_key_key" ON "live_provider_costs"("idempotency_key");

-- CreateIndex
CREATE INDEX "live_provider_costs_created_at_stage_idx" ON "live_provider_costs"("created_at", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "live_policy_versions_version_key" ON "live_policy_versions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "live_policy_versions_active_key_key" ON "live_policy_versions"("active_key");

-- AddForeignKey
ALTER TABLE "live_processing_runs" ADD CONSTRAINT "live_processing_runs_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "live_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_transcript_segments" ADD CONSTRAINT "live_transcript_segments_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "live_processing_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_feed_events" ADD CONSTRAINT "live_feed_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "live_processing_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_feed_event_versions" ADD CONSTRAINT "live_feed_event_versions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "live_feed_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_memory_snapshots" ADD CONSTRAINT "live_memory_snapshots_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "live_processing_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_viewer_sessions" ADD CONSTRAINT "live_viewer_sessions_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "live_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_viewer_sessions" ADD CONSTRAINT "live_viewer_sessions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "live_processing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_coverage" ADD CONSTRAINT "live_session_coverage_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_viewer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_enhancements" ADD CONSTRAINT "live_enhancements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_viewer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_enhancements" ADD CONSTRAINT "live_enhancements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "live_feed_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_provider_costs" ADD CONSTRAINT "live_provider_costs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "live_processing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;


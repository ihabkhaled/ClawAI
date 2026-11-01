-- Idempotent: safe to re-run against a database that already has any of these objects.

DO $$ BEGIN
  CREATE TYPE "AudioKind" AS ENUM ('SPEECH', 'MUSIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AudioGenerationStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "audio_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "thread_id" TEXT,
    "message_id" TEXT,
    "assistant_message_id" TEXT,
    "kind" "AudioKind" NOT NULL,
    "prompt" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "voice" TEXT,
    "format" TEXT NOT NULL DEFAULT 'mp3',
    "status" "AudioGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "latency_ms" INTEGER,
    "superseded_by_id" TEXT,
    "payg_reservation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_generations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audio_generation_assets" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_generation_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audio_generations_user_id_idx" ON "audio_generations"("user_id");
CREATE INDEX IF NOT EXISTS "audio_generations_thread_id_idx" ON "audio_generations"("thread_id");
CREATE INDEX IF NOT EXISTS "audio_generations_message_id_idx" ON "audio_generations"("message_id");
CREATE INDEX IF NOT EXISTS "audio_generations_assistant_message_id_idx" ON "audio_generations"("assistant_message_id");
CREATE INDEX IF NOT EXISTS "audio_generations_status_updated_at_idx" ON "audio_generations"("status", "updated_at");
CREATE INDEX IF NOT EXISTS "audio_generations_superseded_by_id_idx" ON "audio_generations"("superseded_by_id");
CREATE INDEX IF NOT EXISTS "audio_generation_assets_generation_id_idx" ON "audio_generation_assets"("generation_id");

DO $$ BEGIN
  ALTER TABLE "audio_generation_assets" ADD CONSTRAINT "audio_generation_assets_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "audio_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

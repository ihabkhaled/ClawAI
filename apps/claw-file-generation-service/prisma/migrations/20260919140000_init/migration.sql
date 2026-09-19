-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FileGenerationStatus" AS ENUM ('QUEUED', 'STARTING', 'GENERATING_CONTENT', 'CONVERTING', 'FINALIZING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FileFormat" AS ENUM ('TXT', 'MD', 'PDF', 'DOCX', 'CSV', 'JSON', 'HTML');

-- CreateTable
CREATE TABLE "file_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "user_message_id" TEXT,
    "assistant_message_id" TEXT,
    "prompt" TEXT NOT NULL,
    "content" TEXT,
    "format" "FileFormat" NOT NULL,
    "filename" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "FileGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_generation_assets" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "expires_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_generation_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_generation_events" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "status" "FileGenerationStatus" NOT NULL,
    "payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_generation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_generations_user_id_idx" ON "file_generations"("user_id");

-- CreateIndex
CREATE INDEX "file_generations_thread_id_idx" ON "file_generations"("thread_id");

-- CreateIndex
CREATE INDEX "file_generations_status_created_at_idx" ON "file_generations"("status", "created_at");

-- CreateIndex
CREATE INDEX "file_generations_assistant_message_id_idx" ON "file_generations"("assistant_message_id");

-- CreateIndex
CREATE INDEX "file_generation_assets_generation_id_idx" ON "file_generation_assets"("generation_id");

-- CreateIndex
CREATE INDEX "file_generation_assets_expires_at_expired_at_idx" ON "file_generation_assets"("expires_at", "expired_at");

-- CreateIndex
CREATE INDEX "file_generation_events_generation_id_created_at_idx" ON "file_generation_events"("generation_id", "created_at");

-- AddForeignKey
ALTER TABLE "file_generation_assets" ADD CONSTRAINT "file_generation_assets_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "file_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_generation_events" ADD CONSTRAINT "file_generation_events_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "file_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


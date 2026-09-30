-- CreateEnum
CREATE TYPE "VideoGenerationStatus" AS ENUM ('QUEUED', 'STARTING', 'GENERATING', 'FINALIZING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VideoAssetRole" AS ENUM ('OUTPUT', 'REFERENCE');

-- CreateTable
CREATE TABLE "video_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "user_message_id" TEXT,
    "assistant_message_id" TEXT,
    "prompt" TEXT NOT NULL,
    "original_prompt" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL DEFAULT 4,
    "aspect_ratio" TEXT NOT NULL DEFAULT '16:9',
    "is_auto_mode" BOOLEAN NOT NULL DEFAULT false,
    "status" "VideoGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "error_code" TEXT,
    "error_message" TEXT,
    "provider_operation_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "latency_ms" INTEGER,
    "superseded_by_id" TEXT,
    "payg_reservation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_generation_assets" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "duration_seconds" INTEGER,
    "role" "VideoAssetRole" NOT NULL DEFAULT 'OUTPUT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_generation_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_generations_user_id_idx" ON "video_generations"("user_id");

-- CreateIndex
CREATE INDEX "video_generations_thread_id_idx" ON "video_generations"("thread_id");

-- CreateIndex
CREATE INDEX "video_generations_status_created_at_idx" ON "video_generations"("status", "created_at");

-- CreateIndex
CREATE INDEX "video_generations_status_updated_at_idx" ON "video_generations"("status", "updated_at");

-- CreateIndex
CREATE INDEX "video_generations_assistant_message_id_idx" ON "video_generations"("assistant_message_id");

-- CreateIndex
CREATE INDEX "video_generations_superseded_by_id_idx" ON "video_generations"("superseded_by_id");

-- CreateIndex
CREATE INDEX "video_generation_assets_generation_id_idx" ON "video_generation_assets"("generation_id");

-- AddForeignKey
ALTER TABLE "video_generation_assets" ADD CONSTRAINT "video_generation_assets_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "video_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

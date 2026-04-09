-- CreateEnum
CREATE TYPE "ImageGenerationStatus" AS ENUM ('QUEUED', 'STARTING', 'GENERATING', 'FINALIZING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "image_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "user_message_id" TEXT,
    "assistant_message_id" TEXT,
    "prompt" TEXT NOT NULL,
    "revised_prompt" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1024,
    "height" INTEGER NOT NULL DEFAULT 1024,
    "quality" TEXT,
    "style" TEXT,
    "status" "ImageGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_generation_assets" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_generation_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_generation_events" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "status" "ImageGenerationStatus" NOT NULL,
    "payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_generation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_generations_user_id_idx" ON "image_generations"("user_id");

-- CreateIndex
CREATE INDEX "image_generations_thread_id_idx" ON "image_generations"("thread_id");

-- CreateIndex
CREATE INDEX "image_generations_status_created_at_idx" ON "image_generations"("status", "created_at");

-- CreateIndex
CREATE INDEX "image_generations_assistant_message_id_idx" ON "image_generations"("assistant_message_id");

-- CreateIndex
CREATE INDEX "image_generation_assets_generation_id_idx" ON "image_generation_assets"("generation_id");

-- CreateIndex
CREATE INDEX "image_generation_events_generation_id_created_at_idx" ON "image_generation_events"("generation_id", "created_at");

-- AddForeignKey
ALTER TABLE "image_generation_assets" ADD CONSTRAINT "image_generation_assets_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "image_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_generation_events" ADD CONSTRAINT "image_generation_events_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "image_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


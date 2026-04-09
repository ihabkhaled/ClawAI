-- CreateEnum
CREATE TYPE "ImageGenerationStatus" AS ENUM ('PENDING', 'GENERATING', 'DOWNLOADING', 'STORING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "image_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "message_id" TEXT,
    "prompt" TEXT NOT NULL,
    "revised_prompt" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1024,
    "height" INTEGER NOT NULL DEFAULT 1024,
    "quality" TEXT,
    "style" TEXT,
    "file_id" TEXT,
    "status" "ImageGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_generations_user_id_idx" ON "image_generations"("user_id");

-- CreateIndex
CREATE INDEX "image_generations_thread_id_idx" ON "image_generations"("thread_id");

-- CreateIndex
CREATE INDEX "image_generations_status_idx" ON "image_generations"("status");

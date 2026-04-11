-- CreateEnum
CREATE TYPE "ModelCategory" AS ENUM ('CODING', 'FILE_GENERATION', 'IMAGE_GENERATION', 'ROUTING', 'REASONING', 'THINKING', 'GENERAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LocalModelRole" ADD VALUE 'LOCAL_FILE_GENERATION';
ALTER TYPE "LocalModelRole" ADD VALUE 'LOCAL_THINKING';
ALTER TYPE "LocalModelRole" ADD VALUE 'LOCAL_IMAGE_GENERATION';

-- AlterEnum
ALTER TYPE "RuntimeType" ADD VALUE 'COMFYUI';

-- AlterTable
ALTER TABLE "local_models" ADD COLUMN     "category" "ModelCategory";

-- AlterTable
ALTER TABLE "pull_jobs" ADD COLUMN     "downloaded_bytes" BIGINT,
ADD COLUMN     "total_bytes" BIGINT;

-- CreateTable
CREATE TABLE "model_catalog_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" "ModelCategory" NOT NULL,
    "description" TEXT,
    "size_bytes" BIGINT,
    "parameter_count" TEXT,
    "quantization" TEXT,
    "runtime" "RuntimeType" NOT NULL,
    "ollama_name" TEXT,
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "capabilities" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "model_catalog_entries_category_idx" ON "model_catalog_entries"("category");

-- CreateIndex
CREATE INDEX "model_catalog_entries_runtime_idx" ON "model_catalog_entries"("runtime");

-- CreateIndex
CREATE UNIQUE INDEX "model_catalog_entries_name_tag_runtime_key" ON "model_catalog_entries"("name", "tag", "runtime");

-- CreateIndex
CREATE INDEX "local_models_category_idx" ON "local_models"("category");

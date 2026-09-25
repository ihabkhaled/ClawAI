-- CreateEnum
CREATE TYPE "ImageAssetRole" AS ENUM ('OUTPUT', 'REFERENCE');

-- AlterTable
ALTER TABLE "image_generations" ADD COLUMN     "superseded_by_id" TEXT;

-- AlterTable
ALTER TABLE "image_generation_assets" ADD COLUMN     "role" "ImageAssetRole" NOT NULL DEFAULT 'OUTPUT';

-- CreateIndex
CREATE INDEX "image_generations_superseded_by_id_idx" ON "image_generations"("superseded_by_id");


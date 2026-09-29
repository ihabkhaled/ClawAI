-- AlterEnum
ALTER TYPE "ImageAssetRole" ADD VALUE 'MASK';

-- AlterTable
ALTER TABLE "image_generations" ADD COLUMN     "original_prompt" TEXT;

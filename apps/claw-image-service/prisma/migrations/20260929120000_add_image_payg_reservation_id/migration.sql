-- AlterTable
ALTER TABLE "image_generations" ADD COLUMN     "payg_reservation_id" TEXT;

-- CreateIndex
CREATE INDEX "image_generations_status_updated_at_idx" ON "image_generations"("status", "updated_at");

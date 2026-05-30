-- AlterTable
ALTER TABLE "files" ADD COLUMN     "extraction_metadata" JSONB,
ADD COLUMN     "is_extracted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_file_id" TEXT,
ADD COLUMN     "retention_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "files_retention_expires_at_idx" ON "files"("retention_expires_at");

-- CreateIndex
CREATE INDEX "files_parent_file_id_idx" ON "files"("parent_file_id");

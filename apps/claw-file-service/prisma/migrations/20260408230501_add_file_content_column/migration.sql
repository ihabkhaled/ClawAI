-- AlterTable
ALTER TABLE "files" ADD COLUMN     "content" TEXT,
ALTER COLUMN "ingestion_status" SET DEFAULT 'COMPLETED';

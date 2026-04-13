-- AlterTable
ALTER TABLE "chat_threads" ADD COLUMN "quality_threshold" DOUBLE PRECISION;
ALTER TABLE "chat_threads" ADD COLUMN "max_reroute_attempts" INTEGER;

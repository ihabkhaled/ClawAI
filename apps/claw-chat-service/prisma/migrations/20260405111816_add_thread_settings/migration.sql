-- AlterTable
ALTER TABLE "chat_threads" ADD COLUMN     "max_tokens" INTEGER,
ADD COLUMN     "system_prompt" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION DEFAULT 0.7;

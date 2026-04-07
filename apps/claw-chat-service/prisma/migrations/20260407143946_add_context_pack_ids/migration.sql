-- AlterTable
ALTER TABLE "chat_threads" ADD COLUMN     "context_pack_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

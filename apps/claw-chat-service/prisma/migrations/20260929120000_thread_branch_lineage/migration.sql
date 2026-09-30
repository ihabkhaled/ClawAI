-- Branch lineage (chat-supremacy Batch 1).
-- Nullable, no default, no backfill: every existing thread is a root, and a
-- branch made before this migration has no recorded source to point at.
ALTER TABLE "chat_threads" ADD COLUMN "branched_from_thread_id" TEXT;
ALTER TABLE "chat_threads" ADD COLUMN "branched_from_message_id" TEXT;
ALTER TABLE "chat_threads" ADD COLUMN "branch_root_thread_id" TEXT;

CREATE INDEX "chat_threads_user_id_branched_from_thread_id_idx" ON "chat_threads"("user_id", "branched_from_thread_id");
CREATE INDEX "chat_threads_user_id_branch_root_thread_id_idx" ON "chat_threads"("user_id", "branch_root_thread_id");

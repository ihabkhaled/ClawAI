-- ADR-087 — cross-thread retrieval.
--
-- Default FALSE, and that is the whole privacy posture in one word: reaching
-- into a user's other conversations is opt-in. Every existing thread therefore
-- keeps behaving exactly as it does today after this migration runs.
ALTER TABLE "chat_threads"
  ADD COLUMN "use_cross_thread_context" BOOLEAN NOT NULL DEFAULT false;

-- Stage 2 of retrieval reads recent messages for a set of candidate threads.
-- The existing single-column thread_id index cannot serve the ORDER BY, so
-- without this the read degrades to a scan as a user's history grows.
CREATE INDEX IF NOT EXISTS "chat_messages_thread_id_created_at_idx"
  ON "chat_messages" ("thread_id", "created_at");

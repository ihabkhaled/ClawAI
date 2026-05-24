-- Integration V2 (Memory + Context) — chat-service additions.
-- Adds per-thread memory/context toggles and the assembled-context receipt
-- table that backs the "why did the AI know this?" surface.

ALTER TABLE "chat_threads"
  ADD COLUMN "use_memory" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "use_context" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "chat_message_context_receipts" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_context_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chat_message_context_receipts_message_id_unique"
  ON "chat_message_context_receipts"("message_id");
CREATE INDEX "chat_message_context_receipts_thread_id_idx"
  ON "chat_message_context_receipts"("thread_id");
CREATE INDEX "chat_message_context_receipts_userId_createdAt_idx"
  ON "chat_message_context_receipts"("user_id", "created_at");

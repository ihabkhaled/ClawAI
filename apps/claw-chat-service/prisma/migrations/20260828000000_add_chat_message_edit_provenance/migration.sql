-- Edit provenance for a user message.
--
-- `original_content` is written once, the first time a message is edited, and
-- never overwritten. The context receipt on an assistant answer names the prompt
-- that produced it; once the prompt itself can change, keeping the text as first
-- sent is the only way that claim stays checkable.
--
-- Both columns are nullable with no backfill: every existing message is
-- unedited, which is exactly what NULL says.
ALTER TABLE "chat_messages" ADD COLUMN "original_content" TEXT;
ALTER TABLE "chat_messages" ADD COLUMN "edited_at" TIMESTAMP(3);

ALTER TABLE "chat_threads"
ADD COLUMN "critic_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "critic_model" TEXT;

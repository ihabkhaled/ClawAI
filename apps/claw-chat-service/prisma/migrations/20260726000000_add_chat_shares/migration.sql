-- Public shared chats: immutable publication snapshots.
--
-- A published chat is a COPY of the thread at a point in time, not a live view
-- of it. New private messages stay private until the owner explicitly refreshes
-- the snapshot.

CREATE TYPE "ChatShareVisibility" AS ENUM ('PRIVATE', 'PUBLIC_UNLISTED', 'PUBLIC_INDEXED');
CREATE TYPE "ChatShareStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "ChatShareSafetyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW');

CREATE TABLE "chat_shares" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "public_share_id" TEXT NOT NULL,
    "status" "ChatShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "ChatShareVisibility" NOT NULL,
    "safety_status" "ChatShareSafetyStatus" NOT NULL DEFAULT 'PENDING',
    "snapshot_version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "message_count" INTEGER NOT NULL,
    "ads_eligible" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL,
    "last_snapshot_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_share_messages" (
    "id" TEXT NOT NULL,
    "chat_share_id" TEXT NOT NULL,
    "public_message_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "provider_label" TEXT,
    "model_label" TEXT,
    "original_created_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_share_messages_pkey" PRIMARY KEY ("id")
);

-- One share per thread; one public identifier globally.
CREATE UNIQUE INDEX "chat_shares_thread_id_key" ON "chat_shares"("thread_id");
CREATE UNIQUE INDEX "chat_shares_public_share_id_key" ON "chat_shares"("public_share_id");
-- Drives the sitemap feed: active + indexed, ordered by recency.
CREATE INDEX "chat_shares_status_visibility_updated_at_idx" ON "chat_shares"("status", "visibility", "updated_at");
CREATE INDEX "chat_shares_owner_user_id_idx" ON "chat_shares"("owner_user_id");

CREATE UNIQUE INDEX "chat_share_messages_public_message_id_key" ON "chat_share_messages"("public_message_id");
CREATE UNIQUE INDEX "chat_share_messages_chat_share_id_sequence_key" ON "chat_share_messages"("chat_share_id", "sequence");
CREATE INDEX "chat_share_messages_chat_share_id_idx" ON "chat_share_messages"("chat_share_id");

-- Cascade so revoking-by-deletion cannot strand published message copies.
ALTER TABLE "chat_share_messages" ADD CONSTRAINT "chat_share_messages_chat_share_id_fkey"
    FOREIGN KEY ("chat_share_id") REFERENCES "chat_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

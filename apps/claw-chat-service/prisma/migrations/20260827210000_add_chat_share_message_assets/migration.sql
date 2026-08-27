-- Images published with a shared conversation.
--
-- The share owns a COPY of each file rather than a reference to the user's.
-- FileRetentionSweeperManager reaps files whose retention_expires_at has passed,
-- and the user may delete the original at any time — either of which would turn
-- an already-indexed public page into a 404. The copy is stored in file-service
-- with no retention expiry and is deleted when the share is.
--
-- public_asset_id is a fresh random id, like public_message_id: the private file
-- id is a handle onto private storage and must never appear in public output.
--
-- scan_status gates ClawAI's ad and index inventory, not the user's ability to
-- share their own image: a share with an unscanned image is still publishable
-- and still readable by anyone holding the link.
--
-- See docs/13-adr/adr-075-public-share-assets.md.

CREATE TYPE "ChatShareAssetScanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNAVAILABLE');

CREATE TABLE "chat_share_message_assets" (
    "id" TEXT NOT NULL,
    "chat_share_message_id" TEXT NOT NULL,
    "public_asset_id" TEXT NOT NULL,
    "stored_file_id" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "alt_text" TEXT,
    "sequence" INTEGER NOT NULL,
    "scan_status" "ChatShareAssetScanStatus" NOT NULL DEFAULT 'PENDING',
    "scan_reason" TEXT,
    "scanned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_share_message_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_share_message_assets_public_asset_id_key" ON "chat_share_message_assets"("public_asset_id");
CREATE UNIQUE INDEX "chat_share_message_assets_message_sequence_key" ON "chat_share_message_assets"("chat_share_message_id", "sequence");
CREATE INDEX "chat_share_message_assets_message_idx" ON "chat_share_message_assets"("chat_share_message_id");
CREATE INDEX "chat_share_message_assets_scan_status_idx" ON "chat_share_message_assets"("scan_status");

-- ON DELETE CASCADE is the revocation mechanism: deleting a share deletes its
-- messages, which deletes their assets, which is what makes a leaked asset URL
-- die with the share.
ALTER TABLE "chat_share_message_assets"
  ADD CONSTRAINT "chat_share_message_assets_chat_share_message_id_fkey"
  FOREIGN KEY ("chat_share_message_id") REFERENCES "chat_share_messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

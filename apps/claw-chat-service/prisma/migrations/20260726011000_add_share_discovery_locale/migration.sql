ALTER TABLE "chat_shares"
ADD COLUMN "content_locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "index_eligible" BOOLEAN NOT NULL DEFAULT false;

UPDATE "chat_shares"
SET "index_eligible" = true
WHERE "status" = 'ACTIVE'
  AND "visibility" = 'PUBLIC_INDEXED'
  AND "safety_status" = 'APPROVED';

DROP INDEX IF EXISTS "chat_shares_status_visibility_updated_at_idx";
CREATE INDEX "chat_shares_discovery_locale_cursor_idx"
ON "chat_shares"(
  "status",
  "visibility",
  "safety_status",
  "index_eligible",
  "content_locale",
  "updated_at" DESC,
  "id" DESC
);

DELETE FROM "sessions";

DROP INDEX "sessions_refresh_token_key";

ALTER TABLE "sessions"
DROP COLUMN "refresh_token",
ALTER COLUMN "refresh_token_hash" SET NOT NULL,
ALTER COLUMN "family_id" SET NOT NULL;

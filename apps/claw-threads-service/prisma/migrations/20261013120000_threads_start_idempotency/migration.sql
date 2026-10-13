-- ADR-176: a repeated Thread start by the same owner with the same key returns the same publication.
-- Additive and idempotent. Existing rows keep NULL (a NULL never collides in a unique index).
ALTER TABLE "thread_publications" ADD COLUMN IF NOT EXISTS "start_key_hash" TEXT;
ALTER TABLE "thread_publications" ADD COLUMN IF NOT EXISTS "start_request_hash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "thread_publications_owner_id_start_key_hash_key"
    ON "thread_publications"("owner_id", "start_key_hash");

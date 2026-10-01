-- F097: credential class of a paired device. Every existing row is a desktop device, so the default
-- keeps them exactly as they were; only a pairing approved with tokenClass 'mobile' gets the narrow
-- mobile token. Idempotent, so a replay on a database that already has the column is a no-op.
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "tokenClass" TEXT NOT NULL DEFAULT 'device';

CREATE INDEX IF NOT EXISTS "devices_userId_tokenClass_status_idx" ON "devices"("userId", "tokenClass", "status");

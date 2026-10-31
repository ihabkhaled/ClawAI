-- Admin ban, registration origin and presence on users (ADR-200).
--
-- Additive and idempotent: every statement is guarded, so a re-run (or a database
-- that already got the columns by hand) is a no-op. All columns are nullable with no
-- default; nothing is backfilled. A ban is lifetime when banned_at is set and
-- banned_until is NULL. registration_ip is personal data (admin-only, see ADR-200).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_ip" VARCHAR(45);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_country_code" VARCHAR(2);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned_until" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ban_reason" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned_by_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "users_last_seen_at_idx" ON "users"("last_seen_at");
CREATE INDEX IF NOT EXISTS "users_banned_until_idx" ON "users"("banned_until");

-- Session origin, termination record and admin audit (ADR-204).
--
-- Additive and idempotent: every statement is guarded, all new session columns are nullable
-- with no default, nothing is backfilled (old rows read as "unknown"). ip_address is personal
-- data (admin-only). termination_reason is a constrained string validated by the application,
-- so adding a reason never needs another migration.
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(45);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "country_code" VARCHAR(2);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_agent" VARCHAR(512);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "os" VARCHAR(64);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browser" VARCHAR(64);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "device_kind" VARCHAR(16);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "terminated_at" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "terminated_by_user_id" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "termination_reason" VARCHAR(32);

CREATE INDEX IF NOT EXISTS "sessions_user_id_family_id_created_at_idx"
  ON "sessions"("user_id", "family_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "sessions_revoked_at_expires_at_idx"
  ON "sessions"("revoked_at", "expires_at");

CREATE TABLE IF NOT EXISTS "session_admin_audit" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "target_user_id" TEXT,
  "family_count" INTEGER NOT NULL DEFAULT 0,
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_admin_audit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "session_admin_audit_actor_user_id_created_at_idx"
  ON "session_admin_audit"("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "session_admin_audit_target_user_id_created_at_idx"
  ON "session_admin_audit"("target_user_id", "created_at");

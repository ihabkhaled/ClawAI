-- Abuse auto-suspension and banned-device marks (ADR-233, 2026-11-28).
--
-- Additive and idempotent: three new tables, no existing column or constraint is
-- touched, and every statement is guarded, so a re-run is a no-op. Rolling the code
-- back needs no schema change: the old code never reads these tables.
--
-- 1. abuse_signals: per-minute buckets of evidence about an authenticated account
--    (counts and a code only; no token, address, fingerprint or credential).
-- 2. abuse_suspensions: the audit trail of an automatic, reversible suspension. The
--    block itself is the existing ban on users (banned_at / banned_until / ban_reason).
-- 3. banned_device_marks: the peppered device hashes of a permanently banned account.
--    No foreign key on source_user_id on purpose: deleting the account keeps the mark.

CREATE TABLE IF NOT EXISTS "abuse_signals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "counted" BOOLEAN NOT NULL DEFAULT true,
    "bucket_start" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abuse_signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "abuse_signals_user_id_code_bucket_start_key"
    ON "abuse_signals"("user_id", "code", "bucket_start");
CREATE INDEX IF NOT EXISTS "abuse_signals_user_id_created_at_idx"
    ON "abuse_signals"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "abuse_signals_created_at_idx" ON "abuse_signals"("created_at");

CREATE TABLE IF NOT EXISTS "abuse_suspensions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "reason_code" VARCHAR(40) NOT NULL,
    "evidence" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "lifted_at" TIMESTAMP(3),
    "lifted_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_suspensions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "abuse_suspensions_user_id_started_at_idx"
    ON "abuse_suspensions"("user_id", "started_at");

CREATE TABLE IF NOT EXISTS "banned_device_marks" (
    "id" TEXT NOT NULL,
    "hash_kind" VARCHAR(16) NOT NULL,
    "hash_value" VARCHAR(64) NOT NULL,
    "source_user_id" TEXT NOT NULL,
    "reason_code" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lifted_at" TIMESTAMP(3),

    CONSTRAINT "banned_device_marks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "banned_device_marks_hash_kind_hash_value_source_user_id_key"
    ON "banned_device_marks"("hash_kind", "hash_value", "source_user_id");
CREATE INDEX IF NOT EXISTS "banned_device_marks_hash_value_idx" ON "banned_device_marks"("hash_value");
CREATE INDEX IF NOT EXISTS "banned_device_marks_source_user_id_idx"
    ON "banned_device_marks"("source_user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'abuse_signals_user_id_fkey') THEN
    ALTER TABLE "abuse_signals" ADD CONSTRAINT "abuse_signals_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'abuse_suspensions_user_id_fkey') THEN
    ALTER TABLE "abuse_suspensions" ADD CONSTRAINT "abuse_suspensions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

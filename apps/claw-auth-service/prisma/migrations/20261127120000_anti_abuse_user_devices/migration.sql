-- Anti-abuse (security incident 2026-11-27): devices, registration network, and a
-- trial that can start already over.
--
-- Additive and idempotent: every statement is guarded, so a re-run is a no-op.
--
-- 1. user_devices: one row per (user, fingerprint). The fingerprint and the client
--    device id are HMAC-SHA256 hashes under a server pepper; raw values never land here.
-- 2. users.registration_network: the registration address's /24 (IPv4) or /48 (IPv6),
--    backfilled from registration_ip so the bot farm already in the table shows up
--    in the admin linked-accounts view. Only rows Postgres accepts as inet are touched
--    (pg_input_is_valid, PG16+), so one odd value cannot fail the deploy.
-- 3. plan_trial_redemptions: a refused trial is stored with expires_at = started_at
--    ("trial already over"), so the CHECK is relaxed from > to >=. Rolling the code
--    back needs no schema change: the old code never writes an equal pair.
-- 4. An index on plan_trial_redemptions.started_at for the 24 h network count.

CREATE TABLE IF NOT EXISTS "user_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fingerprint_hash" VARCHAR(64) NOT NULL,
    "device_id_hash" VARCHAR(64) NOT NULL,
    "first_ip" VARCHAR(45),
    "last_ip" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "country_code" VARCHAR(2),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_devices_user_id_fingerprint_hash_key"
    ON "user_devices"("user_id", "fingerprint_hash");
CREATE INDEX IF NOT EXISTS "user_devices_fingerprint_hash_idx" ON "user_devices"("fingerprint_hash");
CREATE INDEX IF NOT EXISTS "user_devices_device_id_hash_idx" ON "user_devices"("device_id_hash");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_devices_user_id_fkey') THEN
    ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_network" VARCHAR(64);
CREATE INDEX IF NOT EXISTS "users_registration_network_idx" ON "users"("registration_network");

UPDATE "users"
SET "registration_network" = network(
      set_masklen(
        "registration_ip"::inet,
        CASE WHEN family("registration_ip"::inet) = 4 THEN 24 ELSE 48 END
      )
    )::text
WHERE "registration_network" IS NULL
  AND "registration_ip" IS NOT NULL
  AND pg_input_is_valid("registration_ip", 'inet');

ALTER TABLE "plan_trial_redemptions" DROP CONSTRAINT IF EXISTS "plan_trial_redemptions_duration_check";
ALTER TABLE "plan_trial_redemptions" ADD CONSTRAINT "plan_trial_redemptions_duration_check" CHECK ("expires_at" >= "started_at");

CREATE INDEX IF NOT EXISTS "plan_trial_redemptions_started_at_idx" ON "plan_trial_redemptions"("started_at");

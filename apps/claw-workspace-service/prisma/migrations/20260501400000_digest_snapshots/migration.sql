-- Stream 31 — Daily / weekly digest dashboard

CREATE TYPE "DigestScope" AS ENUM ('DAILY', 'WEEKLY');

CREATE TABLE "digest_snapshots" (
  "id"                          TEXT NOT NULL,
  "user_id"                     VARCHAR(128) NOT NULL,
  "scope"                       "DigestScope" NOT NULL,
  "snapshot_date"               DATE NOT NULL,
  "sections"                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  "action_item_suggestion_ids"  JSONB NOT NULL DEFAULT '[]'::jsonb,
  "generated_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "model_used"                  VARCHAR(128) NOT NULL,
  "duration_ms"                 INTEGER NOT NULL DEFAULT 0,
  "error_message"               TEXT,
  CONSTRAINT "digest_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digest_snapshots_user_scope_date_key"
  ON "digest_snapshots" ("user_id", "scope", "snapshot_date");

CREATE INDEX "digest_snapshots_user_scope_idx"
  ON "digest_snapshots" ("user_id", "scope");

CREATE TABLE "user_digest_preferences" (
  "id"                  TEXT NOT NULL,
  "user_id"             VARCHAR(128) NOT NULL,
  "daily_enabled"       BOOLEAN NOT NULL DEFAULT true,
  "weekly_enabled"      BOOLEAN NOT NULL DEFAULT true,
  "daily_hour_local"    SMALLINT NOT NULL DEFAULT 8,
  "weekly_day_of_week"  SMALLINT NOT NULL DEFAULT 5,
  "weekly_hour_local"   SMALLINT NOT NULL DEFAULT 8,
  "timezone"            VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "providers"           JSONB NOT NULL DEFAULT '[]'::jsonb,
  "last_daily_at"       TIMESTAMP(3),
  "last_weekly_at"      TIMESTAMP(3),
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_digest_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_digest_preferences_user_id_key"
  ON "user_digest_preferences" ("user_id");

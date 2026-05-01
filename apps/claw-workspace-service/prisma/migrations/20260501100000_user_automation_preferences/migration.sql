-- Stream 32 — Per-user automation preferences
CREATE TABLE "user_automation_preferences" (
  "id"                            TEXT NOT NULL,
  "user_id"                       VARCHAR(128) NOT NULL,
  "action_kind"                   VARCHAR(64) NOT NULL,
  "is_enabled"                    BOOLEAN NOT NULL DEFAULT true,
  "auto_approve_below_risk_score" INTEGER,
  "per_day_budget"                INTEGER,
  "providers"                     JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_automation_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_automation_preferences_user_id_action_kind_key"
  ON "user_automation_preferences" ("user_id", "action_kind");

CREATE INDEX "user_automation_preferences_user_id_idx"
  ON "user_automation_preferences" ("user_id");

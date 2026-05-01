-- Stream 13: Suggestion Factory

CREATE TABLE "suggestion_trigger_rules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "event_type" VARCHAR(64) NOT NULL,
  "provider_regex" TEXT NOT NULL DEFAULT '.*',
  "content_regex" TEXT NOT NULL DEFAULT '.*',
  "action_kind_to_suggest" VARCHAR(64) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_system_default" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "created_by" VARCHAR(128),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suggestion_trigger_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suggestion_trigger_rules_name_key" ON "suggestion_trigger_rules"("name");
CREATE INDEX "suggestion_trigger_rules_is_active_priority_idx"
  ON "suggestion_trigger_rules"("is_active", "priority");
CREATE INDEX "suggestion_trigger_rules_event_type_idx"
  ON "suggestion_trigger_rules"("event_type");

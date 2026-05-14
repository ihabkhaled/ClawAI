-- v3 round 9 (2026-05-14) — Prompt 06 polish: per-user email template
-- library. Subject + body starting point for AI-drafted emails.
CREATE TABLE "user_email_templates" (
  "id"         TEXT NOT NULL,
  "user_id"    VARCHAR(128) NOT NULL,
  "name"       VARCHAR(120) NOT NULL,
  "subject"    VARCHAR(500) NOT NULL,
  "body"       TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_email_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_email_templates_user_id_name_key"
  ON "user_email_templates"("user_id", "name");
CREATE INDEX "user_email_templates_user_id_idx"
  ON "user_email_templates"("user_id");

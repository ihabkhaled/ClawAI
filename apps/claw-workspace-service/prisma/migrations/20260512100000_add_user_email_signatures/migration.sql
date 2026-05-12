-- v3 round 5 (2026-05-12) — Prompt 06 polish: DB-backed Gmail signature
-- library with per-user defaults. Callers reference a row id when
-- composing; the Gmail adapter appends the body with the RFC 3676
-- separator. One default row per user is enforced application-side
-- (single UPDATE flips isDefault on save).
CREATE TABLE "user_email_signatures" (
  "id"         TEXT NOT NULL,
  "user_id"    VARCHAR(128) NOT NULL,
  "name"       VARCHAR(120) NOT NULL,
  "body"       TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_email_signatures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_email_signatures_user_id_name_key"
  ON "user_email_signatures"("user_id", "name");
CREATE INDEX "user_email_signatures_user_id_idx"
  ON "user_email_signatures"("user_id");

-- ADR-217: machine translations of published Threads, one row per (publication, language).
-- Additive and idempotent: a new enum and a new table, no existing row is touched.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TranslationStatus') THEN
    CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'RUNNING', 'READY', 'FAILED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "thread_publication_translations" (
  "id" TEXT NOT NULL,
  "publication_id" TEXT NOT NULL,
  "locale" VARCHAR(8) NOT NULL,
  "source_revision" INTEGER NOT NULL,
  "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT,
  "markdown" TEXT,
  "model" VARCHAR(120),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "failure_code" VARCHAR(64),
  "started_at" TIMESTAMP(3),
  "translated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "thread_publication_translations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "thread_publication_translations_publication_id_fkey"
    FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "thread_publication_translations_publication_id_locale_key"
  ON "thread_publication_translations"("publication_id", "locale");
CREATE INDEX IF NOT EXISTS "thread_publication_translations_status_updated_at_idx"
  ON "thread_publication_translations"("status", "updated_at");
CREATE INDEX IF NOT EXISTS "thread_publication_translations_locale_status_idx"
  ON "thread_publication_translations"("locale", "status");

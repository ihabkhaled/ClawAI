-- ADR-189: owner-asked formatting passes. Additive: a new table, no existing row changes.
CREATE TABLE IF NOT EXISTS "thread_format_passes" (
  "id" TEXT NOT NULL,
  "publication_id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "revision_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "code" TEXT,
  "result_markdown" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "thread_format_passes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "thread_format_passes_owner_id_idempotency_key_key"
  ON "thread_format_passes" ("owner_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "thread_format_passes_publication_id_created_at_idx"
  ON "thread_format_passes" ("publication_id", "created_at");

ALTER TABLE "thread_format_passes"
  ADD CONSTRAINT "thread_format_passes_publication_id_fkey"
  FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Memory + Context V2 — embedding columns (follow-up to the initial V2 migration).
-- pgvector(768) matches nomic-embed-text default already in use for
-- workspace_object_embeddings, so no new model pull is required.

ALTER TABLE "memory_records"
  ADD COLUMN "embedding" vector(768),
  ADD COLUMN "embedded_at" TIMESTAMP(3);

ALTER TABLE "context_pack_items"
  ADD COLUMN "embedding" vector(768),
  ADD COLUMN "embedded_at" TIMESTAMP(3);

-- Cosine ivfflat indexes — `lists` matches the workspace_object_embeddings setting.
CREATE INDEX IF NOT EXISTS "memory_records_embedding_ivfflat"
  ON "memory_records" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS "context_pack_items_embedding_ivfflat"
  ON "context_pack_items" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Stream 30 — Workspace object embeddings (cross-provider semantic search)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "workspace_object_embeddings" (
  "id"                  TEXT NOT NULL,
  "workspace_object_id" VARCHAR(128) NOT NULL,
  "user_id"             VARCHAR(128) NOT NULL,
  "provider"            VARCHAR(64) NOT NULL,
  "object_type"         VARCHAR(64) NOT NULL,
  "content_hash"        VARCHAR(64) NOT NULL,
  "content_snippet"     VARCHAR(2048) NOT NULL,
  "embedding"           vector(768) NOT NULL,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workspace_object_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_object_embeddings_object_hash_key"
  ON "workspace_object_embeddings" ("workspace_object_id", "content_hash");

CREATE INDEX "workspace_object_embeddings_user_id_idx"
  ON "workspace_object_embeddings" ("user_id");

CREATE INDEX "workspace_object_embeddings_provider_idx"
  ON "workspace_object_embeddings" ("provider");

-- Approximate-nearest-neighbour index for cosine similarity. Lists tuning is
-- a square-root-of-row-count rule of thumb; defaulting to 100 fits the early
-- volume profile (≤10k embeddings per user).
CREATE INDEX "workspace_object_embeddings_vec_idx"
  ON "workspace_object_embeddings"
  USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

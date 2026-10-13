-- Board search read model. Additive and idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS "thread_publication_search_docs" (
    "publication_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content_locale" TEXT NOT NULL,
    "publication_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "title_norm" TEXT NOT NULL,
    "body_norm" TEXT NOT NULL,
    "reading_minutes" INTEGER NOT NULL DEFAULT 1,
    "source_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "dislike_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6) NOT NULL,
    "tsv" tsvector,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_publication_search_docs_pkey" PRIMARY KEY ("publication_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'thread_publication_search_docs_publication_id_fkey'
  ) THEN
    ALTER TABLE "thread_publication_search_docs"
      ADD CONSTRAINT "thread_publication_search_docs_publication_id_fkey"
      FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "thread_publication_search_docs_tsv_idx"
    ON "thread_publication_search_docs" USING GIN ("tsv");
CREATE INDEX IF NOT EXISTS "thread_publication_search_docs_title_norm_trgm_idx"
    ON "thread_publication_search_docs" USING GIN ("title_norm" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "thread_publication_search_docs_body_norm_trgm_idx"
    ON "thread_publication_search_docs" USING GIN ("body_norm" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "thread_publication_search_docs_content_locale_published_at_slug_idx"
    ON "thread_publication_search_docs" ("content_locale", "published_at" DESC, "slug" DESC);
CREATE INDEX IF NOT EXISTS "thread_publication_search_docs_publication_type_published_at_idx"
    ON "thread_publication_search_docs" ("publication_type", "published_at" DESC);

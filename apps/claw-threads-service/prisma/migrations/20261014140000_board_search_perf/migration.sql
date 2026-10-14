-- Board search performance (round 2: D-P5, D-P6, D-P7, D-P4, D-P2). Additive and idempotent.

-- D-P5: the first migration's two composite index names were longer than 63 characters and Postgres
-- truncated them. Rename them to short names that the Prisma schema declares with `map:`.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'thread_publication_search_docs_content_locale_published_at_slug') THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'board_docs_locale_published_idx') THEN
      DROP INDEX "thread_publication_search_docs_content_locale_published_at_slug";
    ELSE
      ALTER INDEX "thread_publication_search_docs_content_locale_published_at_slug"
        RENAME TO "board_docs_locale_published_idx";
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'thread_publication_search_docs_publication_type_published_at_id') THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'board_docs_type_published_idx') THEN
      DROP INDEX "thread_publication_search_docs_publication_type_published_at_id";
    ELSE
      ALTER INDEX "thread_publication_search_docs_publication_type_published_at_id"
        RENAME TO "board_docs_type_published_idx";
    END IF;
  END IF;
END $$;

-- D-P6: nothing reads body_norm with a trigram operator; the index only cost write time and disk.
DROP INDEX IF EXISTS "thread_publication_search_docs_body_norm_trgm_idx";

-- D-P7: stored trending score (recomputed by the maintenance job) and one btree per sort.
ALTER TABLE "thread_publication_search_docs"
  ADD COLUMN IF NOT EXISTS "trending_score" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "thread_publication_search_docs"
SET "trending_score" =
  (("like_count" - "dislike_count") + 2 * "comment_count" + 0.1 * "view_count")
  / POWER(EXTRACT(EPOCH FROM (now() - "published_at")) / 86400.0 + 2, 1.2)
WHERE "trending_score" = 0;

CREATE INDEX IF NOT EXISTS "board_docs_published_idx"
  ON "thread_publication_search_docs" ("published_at" DESC, "slug" DESC);
CREATE INDEX IF NOT EXISTS "board_docs_discussed_idx"
  ON "thread_publication_search_docs" ("comment_count" DESC, "published_at" DESC, "slug" DESC);
CREATE INDEX IF NOT EXISTS "board_docs_liked_idx"
  ON "thread_publication_search_docs" ("like_count" DESC, "published_at" DESC, "slug" DESC);
CREATE INDEX IF NOT EXISTS "board_docs_trending_idx"
  ON "thread_publication_search_docs" ("trending_score" DESC, "published_at" DESC, "slug" DESC);

-- D-P2: one- and two-character suggestions use a prefix match only; this serves LIKE 'q%' in any collation.
CREATE INDEX IF NOT EXISTS "board_docs_title_prefix_idx"
  ON "thread_publication_search_docs" ("title_norm" text_pattern_ops);

-- D-P4: distinct title words per locale, so "did you mean" is an indexed lookup instead of a scan.
CREATE TABLE IF NOT EXISTS "thread_board_words" (
    "lang" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "freq" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "thread_board_words_pkey" PRIMARY KEY ("lang", "word")
);
CREATE INDEX IF NOT EXISTS "thread_board_words_word_trgm_idx"
  ON "thread_board_words" USING GIN ("word" gin_trgm_ops);

INSERT INTO "thread_board_words" ("lang", "word", "freq")
SELECT d."content_locale", w.word, count(*)::int
FROM "thread_publication_search_docs" d
CROSS JOIN LATERAL regexp_split_to_table(d."title_norm", ' ') AS w(word)
WHERE char_length(w.word) BETWEEN 3 AND 64
GROUP BY d."content_locale", w.word
ON CONFLICT ("lang", "word") DO NOTHING;

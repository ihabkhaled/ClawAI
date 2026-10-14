-- ADR-179: threaded comments, comment votes and resolved mentions. Additive and idempotent.
-- Existing comments keep NULL parent/root (they are top-level comments).
ALTER TABLE "thread_publication_comments" ADD COLUMN IF NOT EXISTS "parent_id" TEXT;
ALTER TABLE "thread_publication_comments" ADD COLUMN IF NOT EXISTS "root_id" TEXT;
ALTER TABLE "thread_publication_comments" ADD COLUMN IF NOT EXISTS "reply_to_user_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "thread_publication_comments"
    ADD CONSTRAINT "thread_publication_comments_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "thread_publication_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "thread_publication_comments"
    ADD CONSTRAINT "thread_publication_comments_root_id_fkey"
    FOREIGN KEY ("root_id") REFERENCES "thread_publication_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "thread_publication_comments_publication_id_root_id_created_at_idx"
    ON "thread_publication_comments"("publication_id", "root_id", "created_at");
CREATE INDEX IF NOT EXISTS "thread_publication_comments_root_id_status_created_at_id_idx"
    ON "thread_publication_comments"("root_id", "status", "created_at", "id");
CREATE INDEX IF NOT EXISTS "thread_publication_comments_parent_id_idx"
    ON "thread_publication_comments"("parent_id");

CREATE TABLE IF NOT EXISTS "thread_publication_comment_reactions" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "value" "PublicationReactionValue" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "thread_publication_comment_reactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "thread_publication_comment_reactions_comment_id_fkey"
      FOREIGN KEY ("comment_id") REFERENCES "thread_publication_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "thread_publication_comment_reactions_comment_id_user_id_key"
    ON "thread_publication_comment_reactions"("comment_id", "user_id");
CREATE INDEX IF NOT EXISTS "thread_publication_comment_reactions_comment_id_value_idx"
    ON "thread_publication_comment_reactions"("comment_id", "value");
CREATE INDEX IF NOT EXISTS "thread_publication_comment_reactions_user_id_idx"
    ON "thread_publication_comment_reactions"("user_id");

CREATE TABLE IF NOT EXISTS "thread_publication_comment_mentions" (
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_publication_comment_mentions_pkey" PRIMARY KEY ("comment_id", "user_id"),
    CONSTRAINT "thread_publication_comment_mentions_comment_id_fkey"
      FOREIGN KEY ("comment_id") REFERENCES "thread_publication_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "thread_publication_comment_mentions_user_id_idx"
    ON "thread_publication_comment_mentions"("user_id");

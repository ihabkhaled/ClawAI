-- Privacy-safe reader counts: a human view counter and a distinct signed-in reader counter.
ALTER TABLE "thread_publications" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "thread_publications" ADD COLUMN "reader_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "thread_publication_views" (
    "id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "viewer_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_publication_views_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "thread_publication_readers" (
    "publication_id" TEXT NOT NULL,
    "reader_hash" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_publication_readers_pkey" PRIMARY KEY ("publication_id", "reader_hash")
);

CREATE INDEX "thread_publication_views_publication_id_viewer_hash_created_at_idx"
    ON "thread_publication_views"("publication_id", "viewer_hash", "created_at");
CREATE INDEX "thread_publication_views_created_at_idx" ON "thread_publication_views"("created_at");
CREATE INDEX "thread_publication_readers_reader_hash_idx" ON "thread_publication_readers"("reader_hash");

ALTER TABLE "thread_publication_views"
    ADD CONSTRAINT "thread_publication_views_publication_id_fkey"
    FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "thread_publication_readers"
    ADD CONSTRAINT "thread_publication_readers_publication_id_fkey"
    FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

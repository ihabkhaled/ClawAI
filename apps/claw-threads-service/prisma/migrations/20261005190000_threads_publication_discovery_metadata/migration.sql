ALTER TABLE "thread_publications"
  ADD COLUMN "content_locale" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "publication_type" TEXT NOT NULL DEFAULT 'article';

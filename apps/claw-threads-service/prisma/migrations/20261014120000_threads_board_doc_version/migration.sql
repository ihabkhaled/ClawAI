-- Board search text-format version. Additive and idempotent.
-- Rows written before segmentation keep doc_version 0; the reconcile job re-indexes them in bounded batches.
ALTER TABLE "thread_publication_search_docs" ADD COLUMN IF NOT EXISTS "doc_version" INTEGER NOT NULL DEFAULT 0;

-- The table is rewritten by upserts and the stale scan; vacuum and analyse it early so bloat stays small.
ALTER TABLE "thread_publication_search_docs" SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

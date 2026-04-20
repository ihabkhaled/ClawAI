-- AlterTable
ALTER TABLE "model_catalog_entries" ADD COLUMN     "search_browser_reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "search_browser_score" DOUBLE PRECISION,
ADD COLUMN     "search_browser_score_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "model_catalog_entries_search_browser_score_idx" ON "model_catalog_entries"("search_browser_score");

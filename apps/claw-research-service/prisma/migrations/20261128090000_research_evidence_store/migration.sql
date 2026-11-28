-- Research engine B1: evidence store + per-thread research reuse.
-- Additive only: a nullable column on research_runs and a new table.

-- AlterTable
ALTER TABLE "research_runs" ADD COLUMN "threadId" TEXT;

-- CreateTable
CREATE TABLE "research_sources" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "url" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "title" TEXT,
    "excerpt" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "language" TEXT,
    "query" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "discoveredVia" TEXT NOT NULL,
    "providerKind" TEXT,
    "fetchStatus" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_runs_threadId_startedAt_idx" ON "research_runs"("threadId", "startedAt");

-- CreateIndex
CREATE INDEX "research_sources_threadId_createdAt_idx" ON "research_sources"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "research_sources_runId_idx" ON "research_sources"("runId");

-- CreateIndex
CREATE INDEX "research_sources_canonicalKey_idx" ON "research_sources"("canonicalKey");

-- AddForeignKey
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_runId_fkey" FOREIGN KEY ("runId") REFERENCES "research_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

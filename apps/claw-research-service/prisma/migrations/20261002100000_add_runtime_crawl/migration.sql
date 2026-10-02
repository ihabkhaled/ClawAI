-- CreateEnum
CREATE TYPE "RuntimeCrawlProfile" AS ENUM ('CRAWL', 'EXTRACT');

-- CreateEnum
CREATE TYPE "RuntimeCrawlStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "runtime_crawl_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profile" "RuntimeCrawlProfile" NOT NULL,
    "startUrl" TEXT NOT NULL,
    "intent" TEXT NOT NULL DEFAULT '',
    "status" "RuntimeCrawlStatus" NOT NULL DEFAULT 'RUNNING',
    "maxPages" INTEGER NOT NULL,
    "maxDepth" INTEGER NOT NULL,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "runtime_crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_crawl_pages" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "textTruncated" BOOLEAN NOT NULL DEFAULT false,
    "links" JSONB NOT NULL DEFAULT '[]',
    "discoveryMethod" TEXT NOT NULL,
    "injectionFlags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runtime_crawl_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_crawl_configs" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxPagesPerRun" INTEGER NOT NULL DEFAULT 50,
    "maxLinkDepth" INTEGER NOT NULL DEFAULT 2,
    "maxConcurrentRunsPerUser" INTEGER NOT NULL DEFAULT 1,
    "dailyPageBudgetPerUser" INTEGER NOT NULL DEFAULT 200,
    "maxRunsPerUserPerDay" INTEGER NOT NULL DEFAULT 20,
    "maxTextCharsPerPage" INTEGER NOT NULL DEFAULT 16000,
    "maxLinksPerPage" INTEGER NOT NULL DEFAULT 50,
    "runTimeoutSeconds" INTEGER NOT NULL DEFAULT 300,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_crawl_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "runtime_crawl_runs_userId_startedAt_idx" ON "runtime_crawl_runs"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "runtime_crawl_runs_userId_status_idx" ON "runtime_crawl_runs"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_crawl_pages_runId_ordinal_key" ON "runtime_crawl_pages"("runId", "ordinal");

-- AddForeignKey
ALTER TABLE "runtime_crawl_pages" ADD CONSTRAINT "runtime_crawl_pages_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runtime_crawl_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

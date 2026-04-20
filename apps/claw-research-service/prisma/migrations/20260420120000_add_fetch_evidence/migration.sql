-- CreateEnum
CREATE TYPE "FetchJobStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CACHED');

-- CreateEnum
CREATE TYPE "ResearchRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "fetch_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "status" "FetchJobStatus" NOT NULL DEFAULT 'RUNNING',
    "httpStatus" INTEGER,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "content" TEXT,
    "title" TEXT,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "fetch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_cache" (
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "httpStatus" INTEGER NOT NULL,
    "mimeType" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "byteSize" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_cache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "research_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedModel" TEXT,
    "requestedProvider" TEXT,
    "workflow" "ResearchWorkflowKind" NOT NULL,
    "intent" TEXT NOT NULL,
    "status" "ResearchRunStatus" NOT NULL DEFAULT 'RUNNING',
    "bundle" JSONB NOT NULL DEFAULT '{}',
    "trace" JSONB NOT NULL DEFAULT '[]',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "research_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fetch_jobs_userId_startedAt_idx" ON "fetch_jobs"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "fetch_jobs_url_startedAt_idx" ON "fetch_jobs"("url", "startedAt");

-- CreateIndex
CREATE INDEX "page_cache_url_idx" ON "page_cache"("url");

-- CreateIndex
CREATE INDEX "page_cache_expiresAt_idx" ON "page_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "research_runs_userId_startedAt_idx" ON "research_runs"("userId", "startedAt");

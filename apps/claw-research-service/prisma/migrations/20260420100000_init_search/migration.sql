-- CreateEnum
CREATE TYPE "SearchProviderKind" AS ENUM ('OLLAMA_WEB', 'TAVILY', 'SEARXNG', 'GENERIC_HTTP');

-- CreateEnum
CREATE TYPE "SearchProviderStatus" AS ENUM ('ACTIVE', 'DISABLED', 'INVALID');

-- CreateEnum
CREATE TYPE "SearchRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResearchWorkflowKind" AS ENUM ('SEARCH_ONLY', 'SEARCH_THEN_FETCH', 'SEARCH_FETCH_EXTRACT', 'REPO_CLONE_ANALYZE');

-- CreateTable
CREATE TABLE "search_providers" (
    "id" TEXT NOT NULL,
    "kind" "SearchProviderKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "encryptedSecret" TEXT,
    "secretVersion" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "status" "SearchProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "publicConfig" JSONB NOT NULL DEFAULT '{}',
    "allowlistDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocklistDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "lastValidatedAt" TIMESTAMP(3),
    "validationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_runs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" "SearchRunStatus" NOT NULL DEFAULT 'RUNNING',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "errorMessage" TEXT,
    "results" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "search_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_providers_name_key" ON "search_providers"("name");

-- CreateIndex
CREATE INDEX "search_providers_kind_idx" ON "search_providers"("kind");

-- CreateIndex
CREATE INDEX "search_providers_status_idx" ON "search_providers"("status");

-- CreateIndex
CREATE INDEX "search_runs_userId_startedAt_idx" ON "search_runs"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "search_runs_providerId_startedAt_idx" ON "search_runs"("providerId", "startedAt");

-- AddForeignKey
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "search_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

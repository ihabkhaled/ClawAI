-- CreateEnum
CREATE TYPE "FetchStrategyKind" AS ENUM ('OFFICIAL_API', 'HTTP_PLAIN', 'HTTP_TLS_IMPERSONATE', 'HEADLESS_BROWSER', 'CRAWL4AI', 'FLARESOLVERR', 'FIRECRAWL', 'READER_PROXY', 'ARCHIVE_SNAPSHOT');

-- AlterTable
ALTER TABLE "fetch_jobs" ADD COLUMN "servedBy" "FetchStrategyKind",
ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "fetch_strategy_configs" (
    "id" TEXT NOT NULL,
    "kind" "FetchStrategyKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tier" INTEGER NOT NULL,
    "publicConfig" JSONB NOT NULL DEFAULT '{}',
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fetch_strategy_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "host_strategy_memory" (
    "host" TEXT NOT NULL,
    "preferredKind" "FetchStrategyKind" NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastBlockSignal" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "host_strategy_memory_pkey" PRIMARY KEY ("host")
);

-- CreateIndex
CREATE UNIQUE INDEX "fetch_strategy_configs_kind_key" ON "fetch_strategy_configs"("kind");

-- CreateIndex
CREATE INDEX "host_strategy_memory_updatedAt_idx" ON "host_strategy_memory"("updatedAt");

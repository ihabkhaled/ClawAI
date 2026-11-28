-- Research engine B3: the platform registry.
-- Additive only: three new enums and a new table. Rows are seeded by the
-- service at boot (create-if-missing by slug), never by this migration.

-- CreateEnum
CREATE TYPE "PlatformCategory" AS ENUM ('NEWS', 'ACADEMIC', 'TECHNICAL', 'SOCIAL', 'VIDEO', 'FORUM', 'OFFICIAL', 'REFERENCE', 'COMMERCE');

-- CreateEnum
CREATE TYPE "PlatformAccessMethod" AS ENUM ('SITE_SEARCH', 'OFFICIAL_API');

-- CreateEnum
CREATE TYPE "PlatformApiKind" AS ENUM ('OPENALEX', 'SEMANTIC_SCHOLAR', 'PUBMED', 'CROSSREF', 'ARXIV', 'STACK_EXCHANGE', 'HN_ALGOLIA', 'GITHUB', 'WIKIPEDIA');

-- CreateTable
CREATE TABLE "research_platforms" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PlatformCategory" NOT NULL,
    "accessMethod" "PlatformAccessMethod" NOT NULL,
    "apiKind" "PlatformApiKind",
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "maxResults" INTEGER NOT NULL DEFAULT 5,
    "timeoutMs" INTEGER NOT NULL DEFAULT 8000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_platforms_slug_key" ON "research_platforms"("slug");

-- CreateIndex
CREATE INDEX "research_platforms_enabled_priority_idx" ON "research_platforms"("enabled", "priority");

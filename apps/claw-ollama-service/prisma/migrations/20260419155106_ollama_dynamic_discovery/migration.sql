-- CreateEnum
CREATE TYPE "DiscoverySourceType" AS ENUM ('OLLAMA_REGISTRY', 'OLLAMA_LIBRARY', 'MANUAL');

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IMPORTED', 'DUPLICATE', 'STALE');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'CLOUD_ONLY', 'UNKNOWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ModelCategory" ADD VALUE 'MEDICAL';
ALTER TYPE "ModelCategory" ADD VALUE 'MARKETING';
ALTER TYPE "ModelCategory" ADD VALUE 'BUSINESS';
ALTER TYPE "ModelCategory" ADD VALUE 'LITERATURE';
ALTER TYPE "ModelCategory" ADD VALUE 'AGENT';
ALTER TYPE "ModelCategory" ADD VALUE 'SUMMARIZATION';
ALTER TYPE "ModelCategory" ADD VALUE 'JUDGE';
ALTER TYPE "ModelCategory" ADD VALUE 'TRANSLATION';
ALTER TYPE "ModelCategory" ADD VALUE 'VISION';
ALTER TYPE "ModelCategory" ADD VALUE 'EMBEDDING';

-- AlterTable
ALTER TABLE "model_catalog_entries" ADD COLUMN     "business_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "discovery_source_id" TEXT,
ADD COLUMN     "download_status" "DownloadStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "hardware_profiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_discovered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "discovery_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DiscoverySourceType" NOT NULL,
    "base_url" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_results" INTEGER NOT NULL DEFAULT 50,
    "min_quality" INTEGER NOT NULL DEFAULT 0,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_runs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'PENDING',
    "is_dry_run" BOOLEAN NOT NULL DEFAULT false,
    "discovered_count" INTEGER NOT NULL DEFAULT 0,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "triggered_by" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_candidates" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "ollama_name" TEXT NOT NULL,
    "description" TEXT,
    "size_bytes" BIGINT,
    "parameter_count" TEXT,
    "family_name" TEXT,
    "runtime" "RuntimeType" NOT NULL DEFAULT 'OLLAMA',
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggested_category" "ModelCategory" NOT NULL,
    "business_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hardware_profiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "download_status" "DownloadStatus" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source_url" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "duplicate_of_id" TEXT,
    "imported_entry_id" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discovery_sources_is_enabled_idx" ON "discovery_sources"("is_enabled");

-- CreateIndex
CREATE INDEX "discovery_sources_type_idx" ON "discovery_sources"("type");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_sources_name_key" ON "discovery_sources"("name");

-- CreateIndex
CREATE INDEX "discovery_runs_source_id_idx" ON "discovery_runs"("source_id");

-- CreateIndex
CREATE INDEX "discovery_runs_status_idx" ON "discovery_runs"("status");

-- CreateIndex
CREATE INDEX "discovery_runs_started_at_idx" ON "discovery_runs"("started_at");

-- CreateIndex
CREATE INDEX "discovery_candidates_status_idx" ON "discovery_candidates"("status");

-- CreateIndex
CREATE INDEX "discovery_candidates_suggested_category_idx" ON "discovery_candidates"("suggested_category");

-- CreateIndex
CREATE INDEX "discovery_candidates_download_status_idx" ON "discovery_candidates"("download_status");

-- CreateIndex
CREATE INDEX "discovery_candidates_ollama_name_idx" ON "discovery_candidates"("ollama_name");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_candidates_run_id_name_tag_key" ON "discovery_candidates"("run_id", "name", "tag");

-- CreateIndex
CREATE INDEX "model_catalog_entries_is_discovered_idx" ON "model_catalog_entries"("is_discovered");

-- CreateIndex
CREATE INDEX "model_catalog_entries_download_status_idx" ON "model_catalog_entries"("download_status");

-- AddForeignKey
ALTER TABLE "model_catalog_entries" ADD CONSTRAINT "model_catalog_entries_discovery_source_id_fkey" FOREIGN KEY ("discovery_source_id") REFERENCES "discovery_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "discovery_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_candidates" ADD CONSTRAINT "discovery_candidates_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "discovery_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

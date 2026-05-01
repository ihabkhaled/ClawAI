-- CreateEnum
CREATE TYPE "ModelCategory" AS ENUM ('CODING', 'REASONING', 'THINKING', 'GENERAL', 'FILE_GENERATION');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('AVAILABLE', 'PULLING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('UNLOADED', 'LOADING', 'READY', 'CRASHED', 'FAILED');

-- CreateEnum
CREATE TYPE "PullJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityTier" AS ENUM ('SURVIVAL', 'BALANCED', 'BEST');

-- CreateTable
CREATE TABLE "FrontierCatalogEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" "ModelCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "parameterCount" TEXT NOT NULL,
    "totalParamsB" INTEGER NOT NULL,
    "activeParamsB" INTEGER NOT NULL,
    "contextLength" INTEGER NOT NULL,
    "capabilities" TEXT[],
    "license" TEXT NOT NULL,
    "huggingfaceRepo" TEXT NOT NULL,
    "filePattern" TEXT NOT NULL,
    "manifestSha256" TEXT,
    "fileSizeBytes" BIGINT NOT NULL,
    "requiredRamGb" INTEGER NOT NULL,
    "recommendedRamGb" INTEGER NOT NULL,
    "requiredDiskGb" INTEGER NOT NULL,
    "recommendedGpuVramGb" INTEGER NOT NULL,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "qualityTier" "QualityTier" NOT NULL DEFAULT 'BALANCED',
    "sourceUrl" TEXT NOT NULL,
    "chatTemplate" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "downloadStatus" "DownloadStatus" NOT NULL DEFAULT 'AVAILABLE',
    "loadStatus" "LoadStatus" NOT NULL DEFAULT 'UNLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrontierCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullJob" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" "PullJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalBytes" BIGINT NOT NULL,
    "downloadedBytes" BIGINT NOT NULL DEFAULT 0,
    "totalFiles" INTEGER NOT NULL,
    "completedFiles" INTEGER NOT NULL DEFAULT 0,
    "currentFile" TEXT,
    "reasonCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "initiatedByUser" TEXT,

    CONSTRAINT "PullJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelLoadEvent" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "pid" INTEGER,
    "port" INTEGER,
    "errorMessage" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelLoadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuntimeConfig" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "nGpuLayers" INTEGER,
    "ctxSize" INTEGER NOT NULL DEFAULT 8192,
    "cpuMoe" BOOLEAN NOT NULL DEFAULT false,
    "threads" INTEGER,
    "customArgs" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuntimeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareSnapshot" (
    "id" TEXT NOT NULL,
    "totalRamGb" INTEGER NOT NULL,
    "freeRamGb" INTEGER NOT NULL,
    "totalDiskGb" INTEGER NOT NULL,
    "freeDiskGb" INTEGER NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "gpus" JSONB NOT NULL,
    "gpuBackend" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardwareSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinaryRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "archiveUrl" TEXT NOT NULL,
    "archiveSha256" TEXT NOT NULL,
    "binaryPath" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BinaryRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreflightOverrideAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "modelId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "reasons" TEXT[],
    "hardwareSnapshot" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreflightOverrideAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrontierCatalogEntry_name_tag_key" ON "FrontierCatalogEntry"("name", "tag");

-- CreateIndex
CREATE INDEX "FrontierCatalogEntry_category_isRecommended_idx" ON "FrontierCatalogEntry"("category", "isRecommended");

-- CreateIndex
CREATE INDEX "PullJob_status_startedAt_idx" ON "PullJob"("status", "startedAt");

-- CreateIndex
CREATE INDEX "PullJob_modelId_idx" ON "PullJob"("modelId");

-- CreateIndex
CREATE INDEX "ModelLoadEvent_modelId_occurredAt_idx" ON "ModelLoadEvent"("modelId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RuntimeConfig_modelId_key" ON "RuntimeConfig"("modelId");

-- CreateIndex
CREATE INDEX "HardwareSnapshot_capturedAt_idx" ON "HardwareSnapshot"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BinaryRelease_version_platform_key" ON "BinaryRelease"("version", "platform");

-- CreateIndex
CREATE INDEX "PreflightOverrideAudit_modelId_occurredAt_idx" ON "PreflightOverrideAudit"("modelId", "occurredAt");

-- AddForeignKey
ALTER TABLE "PullJob" ADD CONSTRAINT "PullJob_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FrontierCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelLoadEvent" ADD CONSTRAINT "ModelLoadEvent_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FrontierCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuntimeConfig" ADD CONSTRAINT "RuntimeConfig_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FrontierCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

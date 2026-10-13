-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CatalogSource" AS ENUM ('FIRST_PARTY', 'CURATED_MCP');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "RuntimeKind" AS ENUM ('BUILTIN', 'MCP_REMOTE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('READ', 'WRITE', 'DESTRUCTIVE');

-- CreateTable
CREATE TABLE "plugin_catalog_entries" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "source" "CatalogSource" NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL,
    "homepage_url" TEXT,
    "translations" JSONB NOT NULL,
    "globally_enabled" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "current_version_id" TEXT,
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_versions" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "runtime_kind" "RuntimeKind" NOT NULL,
    "manifest" JSONB NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "signature" TEXT,
    "changelog" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_tools" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "scopes" TEXT[],
    "disabled_by_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plugin_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "plugin_catalog_entries_slug_key" ON "plugin_catalog_entries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_catalog_entries_current_version_id_key" ON "plugin_catalog_entries"("current_version_id");

-- CreateIndex
CREATE INDEX "plugin_catalog_entries_status_category_idx" ON "plugin_catalog_entries"("status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_versions_entry_id_version_key" ON "plugin_versions"("entry_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_tools_version_id_name_key" ON "plugin_tools"("version_id", "name");

-- AddForeignKey
ALTER TABLE "plugin_versions" ADD CONSTRAINT "plugin_versions_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "plugin_catalog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_tools" ADD CONSTRAINT "plugin_tools_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "plugin_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


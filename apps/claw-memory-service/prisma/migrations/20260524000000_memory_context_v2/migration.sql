-- Memory + Context Flagship V2 — additive migration.
-- Adds enums, columns, and tables required for the V2 control center
-- (suggestion queue, scopes, sensitivity, retention, audit log, usage,
-- preference upsert, context-pack versions/usages/attachments/templates).

-- === New enums ===
CREATE TYPE "MemoryScope" AS ENUM ('USER', 'THREAD', 'WORKSPACE', 'PROJECT');
CREATE TYPE "MemorySource" AS ENUM ('USER_MANUAL', 'AI_EXTRACTED', 'AUTOMATION_LEARNING', 'IMPORTED');
CREATE TYPE "MemorySensitivity" AS ENUM ('NORMAL', 'SENSITIVE', 'REDACTED');
CREATE TYPE "MemoryRetention" AS ENUM ('PERMANENT', 'EXPIRING', 'AUTO_DECAY');
CREATE TYPE "MemorySuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED', 'DISMISSED', 'EXPIRED');
CREATE TYPE "MemoryAuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'USED', 'APPROVED', 'REJECTED', 'TOGGLED', 'PAUSED', 'RESUMED', 'REDACTED', 'IMPORTED', 'EXPORTED');
CREATE TYPE "ContextPackScope" AS ENUM ('USER', 'WORKSPACE', 'PROJECT', 'THREAD');
CREATE TYPE "ContextPackItemType" AS ENUM ('TEXT', 'FILE', 'URL', 'MARKDOWN', 'SNIPPET', 'MEMORY_REF');
CREATE TYPE "ContextPackVisibility" AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC');

-- === MemoryRecord — additive columns ===
ALTER TABLE "memory_records"
  ADD COLUMN "scope" "MemoryScope" NOT NULL DEFAULT 'USER',
  ADD COLUMN "scope_ref" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "category" TEXT,
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN "source" "MemorySource" NOT NULL DEFAULT 'USER_MANUAL',
  ADD COLUMN "sensitivity" "MemorySensitivity" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "retention_policy" "MemoryRetention" NOT NULL DEFAULT 'PERMANENT',
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paused_until" TIMESTAMP(3),
  ADD COLUMN "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN "use_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_used_at" TIMESTAMP(3),
  ADD COLUMN "provenance_json" JSONB;

CREATE INDEX "memory_records_scope_scope_ref_idx" ON "memory_records"("scope", "scope_ref");
CREATE INDEX "memory_records_userId_scope_isEnabled_updatedAt_idx" ON "memory_records"("user_id", "scope", "is_enabled", "updated_at");
CREATE INDEX "memory_records_expires_at_idx" ON "memory_records"("expires_at");

-- === MemorySuggestion ===
CREATE TABLE "memory_suggestions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "MemoryType" NOT NULL,
  "content" TEXT NOT NULL,
  "source_thread_id" TEXT,
  "source_message_id" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL,
  "sensitivity" "MemorySensitivity" NOT NULL DEFAULT 'NORMAL',
  "reason" TEXT,
  "status" "MemorySuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "decided_at" TIMESTAMP(3),
  "decided_by" TEXT,
  "resulting_memory_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_suggestions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "memory_suggestions_userId_status_idx" ON "memory_suggestions"("user_id", "status");
CREATE INDEX "memory_suggestions_created_at_idx" ON "memory_suggestions"("created_at");

-- === MemoryUsage ===
CREATE TABLE "memory_usages" (
  "id" TEXT NOT NULL,
  "memory_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_usages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "memory_usages_memory_id_idx" ON "memory_usages"("memory_id");
CREATE INDEX "memory_usages_userId_createdAt_idx" ON "memory_usages"("user_id", "created_at");
CREATE INDEX "memory_usages_thread_id_idx" ON "memory_usages"("thread_id");
CREATE INDEX "memory_usages_message_id_idx" ON "memory_usages"("message_id");

-- === MemoryAuditLog ===
CREATE TABLE "memory_audit_logs" (
  "id" TEXT NOT NULL,
  "memory_id" TEXT,
  "user_id" TEXT NOT NULL,
  "action" "MemoryAuditAction" NOT NULL,
  "actor" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "memory_audit_logs_memory_id_idx" ON "memory_audit_logs"("memory_id");
CREATE INDEX "memory_audit_logs_userId_createdAt_idx" ON "memory_audit_logs"("user_id", "created_at");

-- === MemoryPreference ===
CREATE TABLE "memory_preferences" (
  "user_id" TEXT NOT NULL,
  "paused_all" BOOLEAN NOT NULL DEFAULT false,
  "auto_approve_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
  "default_retention" "MemoryRetention" NOT NULL DEFAULT 'PERMANENT',
  "default_expires_in_days" INTEGER,
  "redact_by_default" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memory_preferences_pkey" PRIMARY KEY ("user_id")
);

-- === ContextPack — preserve legacy "scope" column first ===
ALTER TABLE "context_packs" RENAME COLUMN "scope" TO "legacy_scope";

ALTER TABLE "context_packs"
  ADD COLUMN "scope" "ContextPackScope" NOT NULL DEFAULT 'USER',
  ADD COLUMN "scope_ref" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "visibility" "ContextPackVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "paused_until" TIMESTAMP(3),
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "template_id" TEXT,
  ADD COLUMN "owner_user_id" TEXT,
  ADD COLUMN "use_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_used_at" TIMESTAMP(3),
  ADD COLUMN "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5;

-- Default ownerUserId to userId (then enforce NOT NULL)
UPDATE "context_packs" SET "owner_user_id" = "user_id" WHERE "owner_user_id" IS NULL;
ALTER TABLE "context_packs" ALTER COLUMN "owner_user_id" SET NOT NULL;

CREATE INDEX "context_packs_scope_scope_ref_idx" ON "context_packs"("scope", "scope_ref");
CREATE INDEX "context_packs_visibility_idx" ON "context_packs"("visibility");

-- === ContextPackItem — additive columns + enum migration ===
ALTER TABLE "context_pack_items"
  ADD COLUMN "item_type" "ContextPackItemType" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "url" TEXT,
  ADD COLUMN "memory_ref_id" TEXT,
  ADD COLUMN "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "token_count_estimate" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "compressed_summary" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve legacy free-text type column under "legacy_type"
ALTER TABLE "context_pack_items" RENAME COLUMN "type" TO "legacy_type";

-- Map known legacy string values to the new enum (defensive — best-effort).
UPDATE "context_pack_items" SET "item_type" = 'FILE'      WHERE "legacy_type" ILIKE 'file%';
UPDATE "context_pack_items" SET "item_type" = 'URL'       WHERE "legacy_type" ILIKE 'url%';
UPDATE "context_pack_items" SET "item_type" = 'MARKDOWN'  WHERE "legacy_type" ILIKE 'markdown%';
UPDATE "context_pack_items" SET "item_type" = 'SNIPPET'   WHERE "legacy_type" ILIKE 'snippet%' OR "legacy_type" ILIKE 'code%';
UPDATE "context_pack_items" SET "item_type" = 'TEXT'      WHERE "legacy_type" IS NULL OR "legacy_type" ILIKE 'text%' OR "legacy_type" ILIKE 'instruction%' OR "legacy_type" = '';

CREATE INDEX "context_pack_items_is_enabled_idx" ON "context_pack_items"("is_enabled");

-- === ContextPackVersion ===
CREATE TABLE "context_pack_versions" (
  "id" TEXT NOT NULL,
  "context_pack_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "payload_json" JSONB NOT NULL,
  "summary" TEXT,
  "changed_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "context_pack_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "context_pack_versions_contextPackId_fkey"
    FOREIGN KEY ("context_pack_id") REFERENCES "context_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "context_pack_versions_packId_version_unique"
  ON "context_pack_versions"("context_pack_id", "version");
CREATE INDEX "context_pack_versions_packId_createdAt_idx"
  ON "context_pack_versions"("context_pack_id", "created_at");

-- === ContextPackUsage ===
CREATE TABLE "context_pack_usages" (
  "id" TEXT NOT NULL,
  "context_pack_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "item_ids_used" TEXT[] NOT NULL DEFAULT '{}',
  "score" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "context_pack_usages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "context_pack_usages_contextPackId_fkey"
    FOREIGN KEY ("context_pack_id") REFERENCES "context_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "context_pack_usages_packId_createdAt_idx"
  ON "context_pack_usages"("context_pack_id", "created_at");
CREATE INDEX "context_pack_usages_thread_id_idx" ON "context_pack_usages"("thread_id");

-- === ContextPackAttachment ===
CREATE TABLE "context_pack_attachments" (
  "id" TEXT NOT NULL,
  "context_pack_id" TEXT NOT NULL,
  "scope" "ContextPackScope" NOT NULL,
  "scope_ref" TEXT NOT NULL,
  "attached_by" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "attached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "context_pack_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "context_pack_attachments_contextPackId_fkey"
    FOREIGN KEY ("context_pack_id") REFERENCES "context_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "context_pack_attachments_pack_scope_ref_unique"
  ON "context_pack_attachments"("context_pack_id", "scope", "scope_ref");
CREATE INDEX "context_pack_attachments_scope_scope_ref_idx"
  ON "context_pack_attachments"("scope", "scope_ref");

-- === ContextPackTemplate ===
CREATE TABLE "context_pack_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "context_pack_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "context_pack_templates_category_idx" ON "context_pack_templates"("category");
CREATE INDEX "context_pack_templates_isSystem_idx" ON "context_pack_templates"("is_system");

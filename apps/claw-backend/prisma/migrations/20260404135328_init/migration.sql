-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "ConnectorProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'AWS_BEDROCK', 'DEEPSEEK', 'OLLAMA');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConnectorAuthType" AS ENUM ('API_KEY', 'OAUTH2', 'NONE');

-- CreateEnum
CREATE TYPE "ModelLifecycle" AS ENUM ('ACTIVE', 'DEPRECATED', 'SUNSET');

-- CreateEnum
CREATE TYPE "RoutingMode" AS ENUM ('AUTO', 'MANUAL_MODEL', 'LOCAL_ONLY', 'PRIVACY_FIRST', 'LOW_LATENCY', 'HIGH_REASONING', 'COST_SAVER');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('SUMMARY', 'FACT', 'PREFERENCE', 'INSTRUCTION');

-- CreateEnum
CREATE TYPE "FileIngestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'ACCESS', 'EXPORT', 'IMPORT', 'SETTINGS_CHANGE', 'CONNECTOR_SYNC', 'ROUTING_DECISION');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LocalModelRole" AS ENUM ('ROUTER', 'LOCAL_FALLBACK_CHAT', 'LOCAL_REASONING', 'LOCAL_CODING');

-- CreateEnum
CREATE TYPE "ModelSyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "ConnectorProvider" NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "auth_type" "ConnectorAuthType" NOT NULL,
    "encrypted_config" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_model_id" TEXT,
    "base_url" TEXT,
    "region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_models" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "provider" "ConnectorProvider" NOT NULL,
    "model_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "lifecycle" "ModelLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "supports_streaming" BOOLEAN NOT NULL DEFAULT false,
    "supports_tools" BOOLEAN NOT NULL DEFAULT false,
    "supports_vision" BOOLEAN NOT NULL DEFAULT false,
    "supports_audio" BOOLEAN NOT NULL DEFAULT false,
    "supports_structured_output" BOOLEAN NOT NULL DEFAULT false,
    "max_context_tokens" INTEGER,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_health_events" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" "ConnectorStatus" NOT NULL,
    "latency_ms" INTEGER,
    "error_message" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_sync_runs" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" "ModelSyncStatus" NOT NULL,
    "models_found" INTEGER NOT NULL DEFAULT 0,
    "models_added" INTEGER NOT NULL DEFAULT 0,
    "models_removed" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "model_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "routing_mode" "RoutingMode" NOT NULL DEFAULT 'AUTO',
    "last_provider" TEXT,
    "last_model" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "routing_mode" "RoutingMode",
    "router_model" TEXT,
    "used_fallback" BOOLEAN NOT NULL DEFAULT false,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "estimated_cost" DECIMAL(12,8),
    "latency_ms" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_decisions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT,
    "thread_id" TEXT NOT NULL,
    "selected_provider" TEXT NOT NULL,
    "selected_model" TEXT NOT NULL,
    "routing_mode" "RoutingMode" NOT NULL,
    "confidence" DECIMAL(5,4),
    "reason_tags" TEXT[],
    "privacy_class" TEXT,
    "cost_class" TEXT,
    "fallback_provider" TEXT,
    "fallback_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "routing_mode" "RoutingMode" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "content" TEXT NOT NULL,
    "source_thread_id" TEXT,
    "source_message_id" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_packs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_pack_items" (
    "id" TEXT NOT NULL,
    "context_pack_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "file_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "ingestion_status" "FileIngestionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_chunks" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "message_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "estimated_cost" DECIMAL(12,8) NOT NULL,
    "latency_ms" INTEGER,
    "routing_mode" "RoutingMode",
    "used_fallback" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'LOW',
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "connectors_provider_idx" ON "connectors"("provider");

-- CreateIndex
CREATE INDEX "connectors_status_idx" ON "connectors"("status");

-- CreateIndex
CREATE INDEX "connectors_is_enabled_idx" ON "connectors"("is_enabled");

-- CreateIndex
CREATE INDEX "connector_models_connector_id_idx" ON "connector_models"("connector_id");

-- CreateIndex
CREATE INDEX "connector_models_provider_idx" ON "connector_models"("provider");

-- CreateIndex
CREATE INDEX "connector_models_lifecycle_idx" ON "connector_models"("lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "connector_models_connector_id_model_key_key" ON "connector_models"("connector_id", "model_key");

-- CreateIndex
CREATE INDEX "connector_health_events_connector_id_idx" ON "connector_health_events"("connector_id");

-- CreateIndex
CREATE INDEX "connector_health_events_checked_at_idx" ON "connector_health_events"("checked_at");

-- CreateIndex
CREATE INDEX "model_sync_runs_connector_id_idx" ON "model_sync_runs"("connector_id");

-- CreateIndex
CREATE INDEX "model_sync_runs_status_idx" ON "model_sync_runs"("status");

-- CreateIndex
CREATE INDEX "chat_threads_user_id_idx" ON "chat_threads"("user_id");

-- CreateIndex
CREATE INDEX "chat_threads_is_pinned_idx" ON "chat_threads"("is_pinned");

-- CreateIndex
CREATE INDEX "chat_threads_is_archived_idx" ON "chat_threads"("is_archived");

-- CreateIndex
CREATE INDEX "chat_threads_created_at_idx" ON "chat_threads"("created_at");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_idx" ON "chat_messages"("thread_id");

-- CreateIndex
CREATE INDEX "chat_messages_role_idx" ON "chat_messages"("role");

-- CreateIndex
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages"("created_at");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

-- CreateIndex
CREATE INDEX "message_attachments_file_id_idx" ON "message_attachments"("file_id");

-- CreateIndex
CREATE INDEX "routing_decisions_message_id_idx" ON "routing_decisions"("message_id");

-- CreateIndex
CREATE INDEX "routing_decisions_thread_id_idx" ON "routing_decisions"("thread_id");

-- CreateIndex
CREATE INDEX "routing_decisions_routing_mode_idx" ON "routing_decisions"("routing_mode");

-- CreateIndex
CREATE INDEX "routing_decisions_created_at_idx" ON "routing_decisions"("created_at");

-- CreateIndex
CREATE INDEX "routing_policies_routing_mode_idx" ON "routing_policies"("routing_mode");

-- CreateIndex
CREATE INDEX "routing_policies_is_active_idx" ON "routing_policies"("is_active");

-- CreateIndex
CREATE INDEX "routing_policies_priority_idx" ON "routing_policies"("priority");

-- CreateIndex
CREATE INDEX "memory_records_user_id_idx" ON "memory_records"("user_id");

-- CreateIndex
CREATE INDEX "memory_records_type_idx" ON "memory_records"("type");

-- CreateIndex
CREATE INDEX "memory_records_is_enabled_idx" ON "memory_records"("is_enabled");

-- CreateIndex
CREATE INDEX "context_packs_user_id_idx" ON "context_packs"("user_id");

-- CreateIndex
CREATE INDEX "context_pack_items_context_pack_id_idx" ON "context_pack_items"("context_pack_id");

-- CreateIndex
CREATE INDEX "context_pack_items_sort_order_idx" ON "context_pack_items"("sort_order");

-- CreateIndex
CREATE INDEX "files_user_id_idx" ON "files"("user_id");

-- CreateIndex
CREATE INDEX "files_ingestion_status_idx" ON "files"("ingestion_status");

-- CreateIndex
CREATE INDEX "file_chunks_file_id_idx" ON "file_chunks"("file_id");

-- CreateIndex
CREATE INDEX "file_chunks_chunk_index_idx" ON "file_chunks"("chunk_index");

-- CreateIndex
CREATE INDEX "usage_ledger_user_id_idx" ON "usage_ledger"("user_id");

-- CreateIndex
CREATE INDEX "usage_ledger_thread_id_idx" ON "usage_ledger"("thread_id");

-- CreateIndex
CREATE INDEX "usage_ledger_provider_idx" ON "usage_ledger"("provider");

-- CreateIndex
CREATE INDEX "usage_ledger_created_at_idx" ON "usage_ledger"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_key_idx" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_models" ADD CONSTRAINT "connector_models_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_health_events" ADD CONSTRAINT "connector_health_events_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_sync_runs" ADD CONSTRAINT "model_sync_runs_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_records" ADD CONSTRAINT "memory_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_packs" ADD CONSTRAINT "context_packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_pack_items" ADD CONSTRAINT "context_pack_items_context_pack_id_fkey" FOREIGN KEY ("context_pack_id") REFERENCES "context_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_pack_items" ADD CONSTRAINT "context_pack_items_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

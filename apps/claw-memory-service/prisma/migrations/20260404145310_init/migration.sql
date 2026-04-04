-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('SUMMARY', 'FACT', 'PREFERENCE', 'INSTRUCTION');

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

-- AddForeignKey
ALTER TABLE "context_pack_items" ADD CONSTRAINT "context_pack_items_context_pack_id_fkey" FOREIGN KEY ("context_pack_id") REFERENCES "context_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

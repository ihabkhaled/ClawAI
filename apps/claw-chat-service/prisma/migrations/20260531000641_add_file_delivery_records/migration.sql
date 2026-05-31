-- CreateTable
CREATE TABLE "file_delivery_records" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "supports_vision" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_delivery_records_message_id_idx" ON "file_delivery_records"("message_id");

-- CreateIndex
CREATE INDEX "file_delivery_records_file_id_provider_model_idx" ON "file_delivery_records"("file_id", "provider", "model");

-- CreateIndex
CREATE INDEX "file_delivery_records_thread_id_file_id_idx" ON "file_delivery_records"("thread_id", "file_id");

-- AddForeignKey
ALTER TABLE "file_delivery_records" ADD CONSTRAINT "file_delivery_records_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

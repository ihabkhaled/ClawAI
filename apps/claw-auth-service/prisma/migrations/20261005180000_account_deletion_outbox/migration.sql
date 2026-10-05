CREATE TABLE "user_deletion_outbox_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_id_digest" TEXT,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_deletion_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_deletion_outbox_events_event_id_key"
    ON "user_deletion_outbox_events"("event_id");
CREATE INDEX "user_deletion_outbox_events_status_available_at_idx"
    ON "user_deletion_outbox_events"("status", "available_at");

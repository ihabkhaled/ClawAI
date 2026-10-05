CREATE TABLE "thread_deleted_accounts" (
    "account_hash" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_deleted_accounts_pkey" PRIMARY KEY ("account_hash")
);

CREATE UNIQUE INDEX "thread_deleted_accounts_event_id_key"
    ON "thread_deleted_accounts"("event_id");

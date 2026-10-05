ALTER TABLE "thread_publication_revisions"
ADD COLUMN "edit_idempotency_key" TEXT,
ADD COLUMN "edit_request_hash" TEXT,
ADD COLUMN "revalidation_job_id" TEXT;

CREATE UNIQUE INDEX "thread_publication_revisions_edit_idempotency_key_key"
ON "thread_publication_revisions"("edit_idempotency_key");

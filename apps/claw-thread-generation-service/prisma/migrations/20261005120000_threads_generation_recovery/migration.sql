ALTER TABLE "thread_generation_jobs"
ADD COLUMN "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "thread_generation_jobs"
ADD COLUMN "dispatch_lease_expires_at" TIMESTAMP(3);

ALTER TABLE "thread_generation_jobs"
ADD COLUMN "budget_close_status" TEXT,
ADD COLUMN "budget_closed_at" TIMESTAMP(3);

CREATE INDEX "thread_generation_jobs_status_next_attempt_at_created_at_idx"
ON "thread_generation_jobs"("status", "next_attempt_at", "created_at");

CREATE INDEX "thread_generation_jobs_status_dispatch_lease_expires_at_idx"
ON "thread_generation_jobs"("status", "dispatch_lease_expires_at");

CREATE UNIQUE INDEX "thread_model_communications_job_id_role_round_key"
ON "thread_model_communications"("job_id", "role", "round");

CREATE TABLE "thread_generation_worker_slots" (
    "slot_id" TEXT NOT NULL,
    "job_id" TEXT,
    "worker_id" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "heartbeat_at" TIMESTAMP(3),
    CONSTRAINT "thread_generation_worker_slots_pkey" PRIMARY KEY ("slot_id")
);

CREATE UNIQUE INDEX "thread_generation_worker_slots_job_id_key"
ON "thread_generation_worker_slots"("job_id");

CREATE INDEX "thread_generation_worker_slots_lease_expires_at_idx"
ON "thread_generation_worker_slots"("lease_expires_at");

INSERT INTO "thread_generation_worker_slots" ("slot_id")
VALUES ('threads-worker-1'), ('threads-worker-2');

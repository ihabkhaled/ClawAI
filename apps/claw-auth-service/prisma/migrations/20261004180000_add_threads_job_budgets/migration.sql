CREATE TYPE "ThreadJobBudgetState" AS ENUM ('ACTIVE', 'FINALIZED', 'RELEASED');
CREATE TYPE "ThreadJobBudgetCallState" AS ENUM ('RESERVED', 'FINALIZED', 'RELEASED');

CREATE TABLE "thread_job_budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_id" VARCHAR(200) NOT NULL,
    "cap_micro_usd" BIGINT NOT NULL,
    "reserved_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "spent_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "status" "ThreadJobBudgetState" NOT NULL DEFAULT 'ACTIVE',
    "feature_reservation_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "thread_job_budgets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "thread_job_budgets_cap_nonnegative" CHECK ("cap_micro_usd" >= 0),
    CONSTRAINT "thread_job_budgets_reserved_nonnegative" CHECK ("reserved_micro_usd" >= 0),
    CONSTRAINT "thread_job_budgets_spent_nonnegative" CHECK ("spent_micro_usd" >= 0),
    CONSTRAINT "thread_job_budgets_within_cap" CHECK ("reserved_micro_usd" + "spent_micro_usd" <= "cap_micro_usd")
);

CREATE TABLE "thread_job_budget_calls" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "request_id" VARCHAR(200) NOT NULL,
    "credit_reservation_id" TEXT,
    "reserved_micro_usd" BIGINT NOT NULL,
    "settled_micro_usd" BIGINT,
    "status" "ThreadJobBudgetCallState" NOT NULL DEFAULT 'RESERVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "thread_job_budget_calls_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "thread_job_budget_calls_amount_nonnegative" CHECK ("reserved_micro_usd" >= 0),
    CONSTRAINT "thread_job_budget_calls_settled_nonnegative" CHECK ("settled_micro_usd" IS NULL OR "settled_micro_usd" >= 0),
    CONSTRAINT "thread_job_budget_calls_settled_within_hold" CHECK ("settled_micro_usd" IS NULL OR "settled_micro_usd" <= "reserved_micro_usd")
);

CREATE UNIQUE INDEX "thread_job_budgets_user_id_request_id_key"
ON "thread_job_budgets"("user_id", "request_id");
CREATE INDEX "thread_job_budgets_user_id_status_created_at_idx"
ON "thread_job_budgets"("user_id", "status", "created_at");
CREATE UNIQUE INDEX "thread_job_budget_calls_credit_reservation_id_key"
ON "thread_job_budget_calls"("credit_reservation_id");
CREATE UNIQUE INDEX "thread_job_budget_calls_budget_id_request_id_key"
ON "thread_job_budget_calls"("budget_id", "request_id");
CREATE INDEX "thread_job_budget_calls_budget_id_status_idx"
ON "thread_job_budget_calls"("budget_id", "status");

ALTER TABLE "thread_job_budgets"
ADD CONSTRAINT "thread_job_budgets_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "thread_job_budget_calls"
ADD CONSTRAINT "thread_job_budget_calls_budget_id_fkey"
FOREIGN KEY ("budget_id") REFERENCES "thread_job_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

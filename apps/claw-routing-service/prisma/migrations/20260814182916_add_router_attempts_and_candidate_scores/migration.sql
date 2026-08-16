-- CreateTable
CREATE TABLE "router_provider_attempts" (
    "id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "decision_id" TEXT,
    "attempt_order" INTEGER NOT NULL,
    "chain_entry_id" TEXT,
    "chain_order" INTEGER,
    "provider" "RouterProvider" NOT NULL,
    "provider_model_id" TEXT NOT NULL,
    "deployment_id" TEXT,
    "succeeded" BOOLEAN NOT NULL,
    "error_code" TEXT,
    "safe_message" TEXT,
    "was_repair" BOOLEAN NOT NULL DEFAULT false,
    "latency_ms" INTEGER NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "router_provider_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_candidate_scores" (
    "id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "decision_id" TEXT,
    "deployment_id" TEXT NOT NULL,
    "provider" "RouterProvider" NOT NULL,
    "provider_model_id" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "exclusion_reason" TEXT,
    "score" DECIMAL(5,4),
    "uncertainty" DECIMAL(5,4),
    "factors" JSONB,
    "rank" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_candidate_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "router_provider_attempts_decision_id_idx" ON "router_provider_attempts"("decision_id");

-- CreateIndex
CREATE INDEX "router_provider_attempts_provider_succeeded_idx" ON "router_provider_attempts"("provider", "succeeded");

-- CreateIndex
CREATE INDEX "router_provider_attempts_error_code_idx" ON "router_provider_attempts"("error_code");

-- CreateIndex
CREATE INDEX "router_provider_attempts_created_at_idx" ON "router_provider_attempts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "router_provider_attempts_trace_id_attempt_order_key" ON "router_provider_attempts"("trace_id", "attempt_order");

-- CreateIndex
CREATE INDEX "routing_candidate_scores_decision_id_idx" ON "routing_candidate_scores"("decision_id");

-- CreateIndex
CREATE INDEX "routing_candidate_scores_trace_id_eligible_idx" ON "routing_candidate_scores"("trace_id", "eligible");

-- CreateIndex
CREATE INDEX "routing_candidate_scores_exclusion_reason_idx" ON "routing_candidate_scores"("exclusion_reason");

-- CreateIndex
CREATE UNIQUE INDEX "routing_candidate_scores_trace_id_deployment_id_key" ON "routing_candidate_scores"("trace_id", "deployment_id");

-- CreateEnum
CREATE TYPE "RoutingMode" AS ENUM ('AUTO', 'MANUAL_MODEL', 'LOCAL_ONLY', 'PRIVACY_FIRST', 'LOW_LATENCY', 'HIGH_REASONING', 'COST_SAVER');

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

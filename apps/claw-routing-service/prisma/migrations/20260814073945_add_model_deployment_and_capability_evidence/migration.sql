-- CreateEnum
CREATE TYPE "RouterProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'DEEPSEEK', 'GROK', 'AWS_BEDROCK', 'OLLAMA', 'OLLAMA_CLOUD', 'LLAMACPP');

-- CreateEnum
CREATE TYPE "DeploymentType" AS ENUM ('CLOUD_API', 'CLOUD_SUBSCRIPTION', 'PRIVATE_CLOUD', 'LOCAL', 'AIR_GAPPED');

-- CreateEnum
CREATE TYPE "DeploymentActivationState" AS ENUM ('REQUIRES_VALIDATION', 'ACTIVE', 'UNHEALTHY', 'QUARANTINED', 'DISABLED', 'RETIRED');

-- CreateEnum
CREATE TYPE "BillingModel" AS ENUM ('TOKEN', 'REQUEST', 'SUBSCRIPTION', 'USAGE_LIMIT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('PROVIDER_DECLARED', 'MANUAL_VERIFIED', 'LAB_MEASURED', 'PRODUCTION_OBSERVED', 'LEARNED_AGGREGATE');

-- CreateTable
CREATE TABLE "model_deployments" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "deployment_key" TEXT NOT NULL,
    "provider" "RouterProvider" NOT NULL,
    "provider_model_id" TEXT NOT NULL,
    "connector_id" TEXT,
    "runtime_id" TEXT,
    "deployment_type" "DeploymentType" NOT NULL,
    "region" TEXT,
    "privacy_class" "PrivacyClass" NOT NULL DEFAULT 'CLOUD_PERMITTED',
    "activation_state" "DeploymentActivationState" NOT NULL DEFAULT 'REQUIRES_VALIDATION',
    "quarantine_reason" TEXT,
    "context_window_tokens" INTEGER,
    "max_output_tokens" INTEGER,
    "supports_tools" BOOLEAN,
    "supports_structured_output" BOOLEAN,
    "supports_streaming" BOOLEAN,
    "supports_vision" BOOLEAN,
    "rate_limit_rpm" INTEGER,
    "rate_limit_tpm" INTEGER,
    "billing_model" "BillingModel" NOT NULL DEFAULT 'UNKNOWN',
    "cost_version_key" TEXT,
    "last_healthy_at" TIMESTAMP(3),
    "last_health_check_at" TIMESTAMP(3),
    "last_validated_at" TIMESTAMP(3),
    "metadata_source" TEXT NOT NULL DEFAULT 'seed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_evidence" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT,
    "definition_id" TEXT,
    "capability" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" "EvidenceSource" NOT NULL,
    "source_ref" TEXT,
    "confidence" DECIMAL(4,3) NOT NULL DEFAULT 0.500,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "valid_from" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "benchmark_version" TEXT,
    "rubric_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_deployments_deployment_key_key" ON "model_deployments"("deployment_key");

-- CreateIndex
CREATE INDEX "model_deployments_definition_id_idx" ON "model_deployments"("definition_id");

-- CreateIndex
CREATE INDEX "model_deployments_provider_idx" ON "model_deployments"("provider");

-- CreateIndex
CREATE INDEX "model_deployments_activation_state_idx" ON "model_deployments"("activation_state");

-- CreateIndex
CREATE INDEX "model_deployments_activation_state_provider_idx" ON "model_deployments"("activation_state", "provider");

-- CreateIndex
CREATE INDEX "model_deployments_deployment_type_idx" ON "model_deployments"("deployment_type");

-- CreateIndex
CREATE INDEX "capability_evidence_deployment_id_capability_idx" ON "capability_evidence"("deployment_id", "capability");

-- CreateIndex
CREATE INDEX "capability_evidence_definition_id_capability_idx" ON "capability_evidence"("definition_id", "capability");

-- CreateIndex
CREATE INDEX "capability_evidence_source_idx" ON "capability_evidence"("source");

-- CreateIndex
CREATE INDEX "capability_evidence_expires_at_idx" ON "capability_evidence"("expires_at");

-- AddForeignKey
ALTER TABLE "model_deployments" ADD CONSTRAINT "model_deployments_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "router_model_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_evidence" ADD CONSTRAINT "capability_evidence_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "model_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_evidence" ADD CONSTRAINT "capability_evidence_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "router_model_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

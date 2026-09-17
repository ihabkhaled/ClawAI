-- CreateEnum
CREATE TYPE "AssistantModelRole" AS ENUM ('RESEARCH_GATE');

-- CreateTable
CREATE TABLE "assistant_models" (
    "id" TEXT NOT NULL,
    "role" "AssistantModelRole" NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "deployment_id" TEXT,
    "model_alias" TEXT NOT NULL,
    "provider" "RouterProvider" NOT NULL,
    "timeout_ms" INTEGER NOT NULL DEFAULT 6000,
    "max_tokens" INTEGER NOT NULL DEFAULT 64,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_models_role_enabled_idx" ON "assistant_models"("role", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_models_role_order_key" ON "assistant_models"("role", "order");

-- RenameIndex
ALTER INDEX "router_workspace_priors_workspace_id_provider_model_task_f_key" RENAME TO "router_workspace_priors_workspace_id_provider_model_task_fa_key";

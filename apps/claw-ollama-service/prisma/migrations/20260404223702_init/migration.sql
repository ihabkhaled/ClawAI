-- CreateEnum
CREATE TYPE "LocalModelRole" AS ENUM ('ROUTER', 'LOCAL_FALLBACK_CHAT', 'LOCAL_REASONING', 'LOCAL_CODING');

-- CreateEnum
CREATE TYPE "RuntimeType" AS ENUM ('OLLAMA', 'VLLM', 'LLAMA_CPP', 'LOCAL_AI');

-- CreateEnum
CREATE TYPE "PullJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "local_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "runtime" "RuntimeType" NOT NULL,
    "size_bytes" BIGINT,
    "family" TEXT,
    "parameters" TEXT,
    "quantization" TEXT,
    "is_installed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_model_roles" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "role" "LocalModelRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_model_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_jobs" (
    "id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "runtime" "RuntimeType" NOT NULL,
    "status" "PullJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "pull_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_configs" (
    "id" TEXT NOT NULL,
    "runtime" "RuntimeType" NOT NULL,
    "base_url" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "local_models_runtime_idx" ON "local_models"("runtime");

-- CreateIndex
CREATE INDEX "local_models_is_installed_idx" ON "local_models"("is_installed");

-- CreateIndex
CREATE UNIQUE INDEX "local_models_name_tag_runtime_key" ON "local_models"("name", "tag", "runtime");

-- CreateIndex
CREATE INDEX "local_model_roles_model_id_idx" ON "local_model_roles"("model_id");

-- CreateIndex
CREATE INDEX "local_model_roles_role_idx" ON "local_model_roles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "local_model_roles_role_is_active_key" ON "local_model_roles"("role", "is_active");

-- CreateIndex
CREATE INDEX "pull_jobs_status_idx" ON "pull_jobs"("status");

-- CreateIndex
CREATE INDEX "pull_jobs_runtime_idx" ON "pull_jobs"("runtime");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_configs_runtime_key" ON "runtime_configs"("runtime");

-- AddForeignKey
ALTER TABLE "local_model_roles" ADD CONSTRAINT "local_model_roles_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "local_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

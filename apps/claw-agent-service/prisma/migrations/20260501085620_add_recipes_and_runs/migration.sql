-- CreateEnum
CREATE TYPE "RecipeRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "RecipeRunStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dsl" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_runs" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "RecipeRunStatus" NOT NULL DEFAULT 'PENDING',
    "params" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_run_steps" (
    "id" TEXT NOT NULL,
    "recipeRunId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "status" "RecipeRunStepStatus" NOT NULL DEFAULT 'PENDING',
    "invocationId" TEXT,
    "output" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipes_userId_isEnabled_idx" ON "recipes"("userId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_userId_name_key" ON "recipes"("userId", "name");

-- CreateIndex
CREATE INDEX "recipe_runs_userId_status_idx" ON "recipe_runs"("userId", "status");

-- CreateIndex
CREATE INDEX "recipe_runs_recipeId_createdAt_idx" ON "recipe_runs"("recipeId", "createdAt");

-- CreateIndex
CREATE INDEX "recipe_runs_status_startedAt_idx" ON "recipe_runs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "recipe_run_steps_recipeRunId_stepIndex_idx" ON "recipe_run_steps"("recipeRunId", "stepIndex");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_run_steps_recipeRunId_stepId_key" ON "recipe_run_steps"("recipeRunId", "stepId");

-- AddForeignKey
ALTER TABLE "recipe_runs" ADD CONSTRAINT "recipe_runs_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_run_steps" ADD CONSTRAINT "recipe_run_steps_recipeRunId_fkey" FOREIGN KEY ("recipeRunId") REFERENCES "recipe_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

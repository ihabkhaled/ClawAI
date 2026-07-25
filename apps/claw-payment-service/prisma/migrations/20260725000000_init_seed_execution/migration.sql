-- CreateTable
CREATE TABLE "seed_executions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seed_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- (name, version) is the run-once key: a completed seeder can never be
-- inserted twice, which is what makes restart- and replica-safety a database
-- guarantee rather than an application convention.
CREATE UNIQUE INDEX "seed_executions_name_version_key" ON "seed_executions"("name", "version");

-- CreateIndex
CREATE INDEX "seed_executions_name_idx" ON "seed_executions"("name");

-- CreateIndex
CREATE INDEX "seed_executions_status_idx" ON "seed_executions"("status");

-- AlterTable
ALTER TABLE "workspace_actions"
  ADD COLUMN "idempotency_key" VARCHAR(128),
  ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex (partial: NULLs allowed in idempotency_key; uniqueness enforced per-user)
CREATE UNIQUE INDEX "workspace_actions_user_id_idempotency_key_key"
  ON "workspace_actions"("user_id", "idempotency_key");

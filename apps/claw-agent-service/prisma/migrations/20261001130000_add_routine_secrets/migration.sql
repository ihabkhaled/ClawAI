-- F099 step 2: per-routine secrets a routine can read. Idempotent: every statement can run twice.
-- Only ciphertext is stored (AES-256-GCM, per-row nonce, AAD = routineId + userId + name).

ALTER TABLE "scheduled_commands" ADD COLUMN IF NOT EXISTS "webhookSecretsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "terminal_commands" ADD COLUMN IF NOT EXISTS "routineId" TEXT,
ADD COLUMN IF NOT EXISTS "routineRunSource" TEXT;

CREATE TABLE IF NOT EXISTS "routine_secrets" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "routine_secrets_routineId_name_key" ON "routine_secrets"("routineId", "name");

CREATE INDEX IF NOT EXISTS "routine_secrets_userId_idx" ON "routine_secrets"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'routine_secrets_routineId_fkey'
    ) THEN
        ALTER TABLE "routine_secrets" ADD CONSTRAINT "routine_secrets_routineId_fkey"
            FOREIGN KEY ("routineId") REFERENCES "scheduled_commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

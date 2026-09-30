-- F099 prompt routines and F100 runner credentials.
--
-- A PROMPT routine has no device: it is dispatched to an online runner whose
-- labels match, so scheduled_commands.deviceId becomes nullable. Existing rows
-- keep kind COMMAND and behave exactly as before.
--
-- runner_credentials holds only the SHA-256 of a runner's token. The token is
-- returned once at registration or rotation and cannot be recovered from here.
CREATE TYPE "ScheduledCommandKind" AS ENUM ('COMMAND', 'PROMPT');

CREATE TYPE "TerminalCommandKind" AS ENUM ('SHELL', 'PROMPT');

ALTER TABLE "terminal_commands" ADD COLUMN "kind" "TerminalCommandKind" NOT NULL DEFAULT 'SHELL',
ADD COLUMN "model" TEXT,
ADD COLUMN "repoRef" TEXT;

ALTER TABLE "scheduled_commands" ADD COLUMN "kind" "ScheduledCommandKind" NOT NULL DEFAULT 'COMMAND',
ADD COLUMN "model" TEXT,
ADD COLUMN "repoRef" TEXT,
ADD COLUMN "runnerLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "deviceId" DROP NOT NULL;

CREATE TABLE "runner_credentials" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "runner_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "runner_credentials_sessionId_key" ON "runner_credentials"("sessionId");

CREATE UNIQUE INDEX "runner_credentials_tokenHash_key" ON "runner_credentials"("tokenHash");

CREATE INDEX "runner_credentials_userId_idx" ON "runner_credentials"("userId");

ALTER TABLE "runner_credentials" ADD CONSTRAINT "runner_credentials_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

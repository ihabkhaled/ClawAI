-- CreateEnum
CREATE TYPE "AgentSessionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TerminalCommandStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FileEventType" AS ENUM ('CREATED', 'MODIFIED', 'DELETED', 'RENAMED');

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "status" "AgentSessionStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastHeartbeatAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminal_commands" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "workingDir" TEXT,
    "status" "TerminalCommandStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "stdout" TEXT,
    "stderr" TEXT,
    "exitCode" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminal_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_repos" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoPath" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch" TEXT,
    "commitHash" TEXT,
    "isDirty" BOOLEAN NOT NULL DEFAULT false,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_repos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_watch_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "FileEventType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "repoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_watch_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_sessions_sessionKey_key" ON "agent_sessions"("sessionKey");

-- CreateIndex
CREATE INDEX "agent_sessions_userId_status_idx" ON "agent_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "agent_sessions_sessionKey_idx" ON "agent_sessions"("sessionKey");

-- CreateIndex
CREATE INDEX "terminal_commands_sessionId_status_idx" ON "terminal_commands"("sessionId", "status");

-- CreateIndex
CREATE INDEX "terminal_commands_userId_status_idx" ON "terminal_commands"("userId", "status");

-- CreateIndex
CREATE INDEX "local_repos_userId_idx" ON "local_repos"("userId");

-- CreateIndex
CREATE INDEX "local_repos_sessionId_idx" ON "local_repos"("sessionId");

-- CreateIndex
CREATE INDEX "file_watch_events_sessionId_createdAt_idx" ON "file_watch_events"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "file_watch_events_userId_createdAt_idx" ON "file_watch_events"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "terminal_commands" ADD CONSTRAINT "terminal_commands_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_repos" ADD CONSTRAINT "local_repos_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_watch_events" ADD CONSTRAINT "file_watch_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

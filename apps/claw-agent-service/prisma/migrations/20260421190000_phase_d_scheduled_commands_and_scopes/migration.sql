-- CreateEnum
CREATE TYPE "ScheduledCommandStatus" AS ENUM ('ENABLED', 'PAUSED', 'DISABLED');

-- CreateTable
CREATE TABLE "scheduled_commands" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "workingDir" TEXT,
    "intervalMinutes" INTEGER NOT NULL,
    "status" "ScheduledCommandStatus" NOT NULL DEFAULT 'ENABLED',
    "lastRunAt" TIMESTAMP(3),
    "lastCommandId" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_commands_deviceId_status_idx" ON "scheduled_commands"("deviceId", "status");

-- CreateIndex
CREATE INDEX "scheduled_commands_nextRunAt_status_idx" ON "scheduled_commands"("nextRunAt", "status");

-- AddForeignKey
ALTER TABLE "scheduled_commands" ADD CONSTRAINT "scheduled_commands_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

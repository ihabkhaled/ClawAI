-- AlterEnum
ALTER TYPE "TerminalCommandStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "terminal_commands"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "timeoutSeconds" INTEGER NOT NULL DEFAULT 300;

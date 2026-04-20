-- CreateEnum
CREATE TYPE "PolicyKind" AS ENUM ('ALLOW', 'DENY', 'AUTO_APPROVE');

-- CreateEnum
CREATE TYPE "RiskLabel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "terminal_commands"
  ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "riskLabel" "RiskLabel" NOT NULL DEFAULT 'LOW',
  ADD COLUMN "matchedPolicyId" TEXT,
  ADD COLUMN "riskReasons" TEXT,
  ADD COLUMN "autoApproved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "blockedByPolicy" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "access_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PolicyKind" NOT NULL,
    "pattern" TEXT NOT NULL,
    "scope" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLabel" "RiskLabel" NOT NULL DEFAULT 'LOW',
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_policies_kind_isActive_priority_idx" ON "access_policies"("kind", "isActive", "priority");

-- CreateIndex
CREATE INDEX "access_policies_orgId_idx" ON "access_policies"("orgId");

-- CreateIndex
CREATE INDEX "terminal_commands_matchedPolicyId_idx" ON "terminal_commands"("matchedPolicyId");

-- AddForeignKey
ALTER TABLE "terminal_commands" ADD CONSTRAINT "terminal_commands_matchedPolicyId_fkey" FOREIGN KEY ("matchedPolicyId") REFERENCES "access_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

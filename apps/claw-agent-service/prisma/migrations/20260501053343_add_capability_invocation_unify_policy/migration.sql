-- CreateEnum
CREATE TYPE "CapabilityClass" AS ENUM ('TERMINAL', 'FILESYSTEM', 'PROCESS', 'BROWSER', 'SCREEN', 'CLIPBOARD', 'NOTIFICATION', 'APPLICATION', 'AUDIO', 'SYSTEM', 'RECIPE_STEP');

-- CreateEnum
CREATE TYPE "CapabilityOperation" AS ENUM ('READ', 'WRITE', 'APPEND', 'MOVE', 'DELETE', 'LIST', 'STAT', 'WATCH', 'SEARCH', 'DIFF', 'MKDIR', 'SPAWN', 'KILL', 'SIGNAL', 'SET_ENV', 'TAIL_OUTPUT', 'OPEN', 'NAVIGATE', 'CLICK', 'FILL', 'SCROLL', 'SCREENSHOT', 'EXTRACT_TEXT', 'UPLOAD_FILE', 'DOWNLOAD', 'NETWORK_TRACE', 'INTERCEPT', 'COOKIE_READ', 'COOKIE_CLEAR', 'SESSION_SAVE', 'SESSION_RESTORE', 'CAPTURE_FULL', 'CAPTURE_REGION', 'CAPTURE_WINDOW', 'OCR', 'COLOR_PICK', 'FIND_IMAGE', 'RECORD_VIDEO', 'COMPARE_REGIONS', 'GET_TEXT', 'SET_TEXT', 'GET_IMAGE', 'PUSH', 'POP', 'HISTORY', 'SHOW_TOAST', 'SHOW_MODAL', 'SHOW_TRAY', 'LAUNCH', 'ACTIVATE', 'QUIT', 'LIST_RUNNING', 'LIST_INSTALLED', 'SEND_KEYSTROKE', 'CLICK_ELEMENT', 'READ_ELEMENT', 'FIND_WINDOW', 'TRANSCRIBE_FILE', 'TRANSCRIBE_MIC', 'SYNTHESISE', 'PLAY', 'RECORD', 'NETWORK_INFO', 'DISK_USAGE', 'TIMEZONE', 'LOCK', 'SUSPEND', 'COMPOSITE');

-- CreateEnum
CREATE TYPE "CapabilityBlastRadius" AS ENUM ('NONE', 'SINGLE_RESOURCE', 'MANY_RESOURCES', 'USER_SCOPE', 'SYSTEM_SCOPE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "CapabilityReversibility" AS ENUM ('REVERSIBLE', 'COMPENSATABLE', 'IRREVERSIBLE');

-- CreateEnum
CREATE TYPE "CapabilityInvocationStatus" AS ENUM ('PENDING_APPROVAL', 'AUTO_APPROVED', 'APPROVED', 'EXECUTING', 'EXECUTED', 'FAILED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ROLLED_BACK', 'ROLLBACK_FAILED', 'DENIED');

-- AlterTable
ALTER TABLE "access_policies" ADD COLUMN     "autoApproveMaxRiskScore" INTEGER,
ADD COLUMN     "capabilityClass" "CapabilityClass",
ADD COLUMN     "capabilityOperation" "CapabilityOperation",
ADD COLUMN     "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireReason" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetMatcherJson" JSONB;

-- CreateTable
CREATE TABLE "capability_invocations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "recipeRunId" TEXT,
    "parentInvocationId" TEXT,
    "capabilityClass" "CapabilityClass" NOT NULL,
    "capabilityOperation" "CapabilityOperation" NOT NULL,
    "targetDescriptor" JSONB NOT NULL,
    "requiredScopes" JSONB NOT NULL,
    "blastRadius" "CapabilityBlastRadius" NOT NULL,
    "reversibility" "CapabilityReversibility" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "CapabilityInvocationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLabel" "RiskLabel" NOT NULL DEFAULT 'LOW',
    "matchedPolicyId" TEXT,
    "matchedPolicyName" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "startedExecutingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executionResult" JSONB,
    "executionError" TEXT,
    "undoPlan" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "rollbackResult" JSONB,
    "rollbackError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capability_invocations_userId_status_idx" ON "capability_invocations"("userId", "status");

-- CreateIndex
CREATE INDEX "capability_invocations_deviceId_status_idx" ON "capability_invocations"("deviceId", "status");

-- CreateIndex
CREATE INDEX "capability_invocations_recipeRunId_idx" ON "capability_invocations"("recipeRunId");

-- CreateIndex
CREATE INDEX "capability_invocations_status_expiresAt_idx" ON "capability_invocations"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "capability_invocations_capabilityClass_capabilityOperation_idx" ON "capability_invocations"("capabilityClass", "capabilityOperation");

-- CreateIndex
CREATE INDEX "capability_invocations_matchedPolicyId_idx" ON "capability_invocations"("matchedPolicyId");

-- CreateIndex
CREATE INDEX "access_policies_capabilityClass_capabilityOperation_isActiv_idx" ON "access_policies"("capabilityClass", "capabilityOperation", "isActive", "priority");

-- AddForeignKey
ALTER TABLE "capability_invocations" ADD CONSTRAINT "capability_invocations_matchedPolicyId_fkey" FOREIGN KEY ("matchedPolicyId") REFERENCES "access_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_invocations" ADD CONSTRAINT "capability_invocations_parentInvocationId_fkey" FOREIGN KEY ("parentInvocationId") REFERENCES "capability_invocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

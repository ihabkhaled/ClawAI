-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "RefreshTokenStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "DeviceCodeStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CONSUMED');

-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "agent_sessions" ADD COLUMN "deprecatedKey" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "scopesCsv" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3),
    "lastIp" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "status" "RefreshTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedIp" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairing_requests" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "stateNonce" TEXT NOT NULL,
    "deviceHint" JSONB NOT NULL,
    "loopbackPort" INTEGER,
    "status" "PairingStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByUserId" TEXT,
    "approvedDeviceId" TEXT,
    "approvedScopesCsv" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "pairing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_code_requests" (
    "id" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "deviceHint" JSONB NOT NULL,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 5,
    "slowDownUntil" TIMESTAMP(3),
    "offenceCount" INTEGER NOT NULL DEFAULT 0,
    "status" "DeviceCodeStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByUserId" TEXT,
    "approvedDeviceId" TEXT,
    "approvedScopesCsv" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "device_code_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_sessions_deviceId_idx" ON "agent_sessions"("deviceId");

-- CreateIndex
CREATE INDEX "devices_userId_status_idx" ON "devices"("userId", "status");

-- CreateIndex
CREATE INDEX "devices_userId_lastSeenAt_idx" ON "devices"("userId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_deviceId_status_idx" ON "refresh_tokens"("deviceId", "status");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "pairing_requests_codeHash_key" ON "pairing_requests"("codeHash");

-- CreateIndex
CREATE INDEX "pairing_requests_status_expiresAt_idx" ON "pairing_requests"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_code_requests_userCode_key" ON "device_code_requests"("userCode");

-- CreateIndex
CREATE UNIQUE INDEX "device_code_requests_deviceCodeHash_key" ON "device_code_requests"("deviceCodeHash");

-- CreateIndex
CREATE INDEX "device_code_requests_status_expiresAt_idx" ON "device_code_requests"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

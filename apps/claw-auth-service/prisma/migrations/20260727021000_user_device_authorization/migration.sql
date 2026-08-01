CREATE TYPE "DeviceAuthorizationStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CONSUMED');

CREATE TABLE "device_authorization_grants" (
  "id" TEXT NOT NULL,
  "device_code_hash" TEXT NOT NULL,
  "user_code" TEXT NOT NULL,
  "client_name" TEXT NOT NULL,
  "client_version" TEXT NOT NULL,
  "status" "DeviceAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "approved_by_user_id" TEXT,
  "interval_seconds" INTEGER NOT NULL DEFAULT 5,
  "last_polled_at" TIMESTAMP(3),
  "poll_violation_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "approved_at" TIMESTAMP(3),
  "denied_at" TIMESTAMP(3),
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "device_authorization_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_authorization_grants_device_code_hash_key" ON "device_authorization_grants"("device_code_hash");
CREATE UNIQUE INDEX "device_authorization_grants_user_code_key" ON "device_authorization_grants"("user_code");
CREATE INDEX "device_authorization_grants_status_expires_at_idx" ON "device_authorization_grants"("status", "expires_at");
CREATE INDEX "device_authorization_grants_approved_by_user_id_idx" ON "device_authorization_grants"("approved_by_user_id");

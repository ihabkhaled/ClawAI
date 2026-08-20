-- CreateEnum
CREATE TYPE "EmailChangeStage" AS ENUM ('OLD_EMAIL_PENDING', 'NEW_EMAIL_PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "email_change_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_email" TEXT NOT NULL,
    "stage" "EmailChangeStage" NOT NULL,
    "old_email_otp_hash" TEXT NOT NULL,
    "old_email_otp_expires_at" TIMESTAMP(3) NOT NULL,
    "old_email_attempts" INTEGER NOT NULL DEFAULT 0,
    "old_email_verified_at" TIMESTAMP(3),
    "new_email_token_hash" TEXT,
    "new_email_expires_at" TIMESTAMP(3),
    "last_sent_at" TIMESTAMP(3),
    "active_key" TEXT,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_change_requests_new_email_token_hash_key" ON "email_change_requests"("new_email_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "email_change_requests_active_key_key" ON "email_change_requests"("active_key");

-- CreateIndex
CREATE INDEX "email_change_requests_user_id_stage_idx" ON "email_change_requests"("user_id", "stage");

-- CreateIndex
CREATE INDEX "email_change_requests_old_email_otp_expires_at_idx" ON "email_change_requests"("old_email_otp_expires_at");

-- CreateIndex
CREATE INDEX "email_change_requests_new_email_expires_at_idx" ON "email_change_requests"("new_email_expires_at");

-- AddForeignKey
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
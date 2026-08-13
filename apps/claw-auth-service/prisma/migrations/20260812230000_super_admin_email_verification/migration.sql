ALTER TABLE "users"
ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "email_verified_at" TIMESTAMP(3);

UPDATE "users"
SET "is_super_admin" = true,
    "email_verified_at" = COALESCE("email_verified_at", CURRENT_TIMESTAMP)
WHERE "email" = 'admin@claw.local' AND "role" = 'ADMIN';

CREATE UNIQUE INDEX "users_single_super_admin_idx"
ON "users" ("is_super_admin") WHERE "is_super_admin" = true;

CREATE TABLE "email_verification_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_verification_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

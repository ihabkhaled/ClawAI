-- Credentials for dispatching the production deployment workflow, managed from
-- the admin deployment page instead of .env. Exactly one row (id is pinned by
-- the application), token encrypted at rest with ENCRYPTION_KEY.
-- CreateTable
CREATE TABLE "deployment_credentials" (
    "id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "token_last_four" TEXT NOT NULL,
    "encryption_key_version" INTEGER NOT NULL DEFAULT 1,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_credentials_pkey" PRIMARY KEY ("id")
);

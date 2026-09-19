-- Read-only operator tokens for production logs and health (ADR-102).
CREATE TABLE "ops_access_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "created_by_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ops_access_tokens_token_hash_key" ON "ops_access_tokens"("token_hash");
CREATE INDEX "ops_access_tokens_created_by_user_id_idx" ON "ops_access_tokens"("created_by_user_id");

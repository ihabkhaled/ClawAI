CREATE TYPE "SessionClientKind" AS ENUM ('WEB', 'VSCODE');

ALTER TABLE "sessions"
ADD COLUMN "refresh_token_hash" TEXT,
ADD COLUMN "family_id" TEXT,
ADD COLUMN "client_kind" "SessionClientKind" NOT NULL DEFAULT 'WEB',
ADD COLUMN "client_name" TEXT,
ADD COLUMN "used_at" TIMESTAMP(3),
ADD COLUMN "revoked_at" TIMESTAMP(3),
ADD COLUMN "replaced_by_session_id" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "sessions_refresh_token_hash_key"
ON "sessions"("refresh_token_hash");

CREATE INDEX "sessions_family_id_idx"
ON "sessions"("family_id");

-- Additive and idempotent: the in-chat consent card (consent requests, per-chat grants, the
-- confirmed-DESTRUCTIVE flag on a stored tool consent).

DO $$ BEGIN
  CREATE TYPE "ConsentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CONSUMED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConsentChoice" AS ENUM ('ALLOW_ONCE', 'ALLOW_CHAT', 'ALWAYS_ALLOW', 'DENY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "plugin_tool_consents" ADD COLUMN IF NOT EXISTS "confirmed_destructive" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "plugin_consent_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "install_id" TEXT,
    "server_id" TEXT,
    "plugin_slug" TEXT NOT NULL,
    "plugin_name" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "tool_title" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "call_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "message_id" TEXT,
    "surface" TEXT NOT NULL,
    "args_hash" TEXT NOT NULL,
    "args_preview" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ConsentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "choice" "ConsentChoice",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "decided_at" TIMESTAMP(3),
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "plugin_consent_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plugin_consent_requests_user_id_call_id_key" ON "plugin_consent_requests"("user_id", "call_id");
CREATE INDEX IF NOT EXISTS "plugin_consent_requests_user_id_status_expires_at_idx" ON "plugin_consent_requests"("user_id", "status", "expires_at");
CREATE INDEX IF NOT EXISTS "plugin_consent_requests_conversation_id_idx" ON "plugin_consent_requests"("conversation_id");

CREATE TABLE IF NOT EXISTS "plugin_chat_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "target_key" TEXT NOT NULL,
    "plugin_slug" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_chat_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plugin_chat_consents_user_id_conversation_id_target_key_tool_name_key" ON "plugin_chat_consents"("user_id", "conversation_id", "target_key", "tool_name");
CREATE INDEX IF NOT EXISTS "plugin_chat_consents_user_id_expires_at_idx" ON "plugin_chat_consents"("user_id", "expires_at");

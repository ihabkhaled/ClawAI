-- Stream 41 — IMPL_PROMPT handoff records (chat | agent | clipboard)

CREATE TYPE "ImplPromptHandoffMode" AS ENUM ('CHAT', 'AGENT', 'CLIPBOARD');
CREATE TYPE "ImplPromptHandoffStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

CREATE TABLE "impl_prompt_handoffs" (
  "id"                          TEXT NOT NULL,
  "source_queue_id"             VARCHAR(128) NOT NULL,
  "user_id"                     VARCHAR(128) NOT NULL,
  "mode"                        "ImplPromptHandoffMode" NOT NULL,
  "target_thread_id"            VARCHAR(128),
  "target_terminal_command_id"  VARCHAR(128),
  "status"                      "ImplPromptHandoffStatus" NOT NULL DEFAULT 'PENDING',
  "error_message"               TEXT,
  "brief_snippet"               VARCHAR(1024) NOT NULL,
  "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at"                TIMESTAMP(3),
  CONSTRAINT "impl_prompt_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "impl_prompt_handoffs_user_id_idx" ON "impl_prompt_handoffs" ("user_id");
CREATE INDEX "impl_prompt_handoffs_source_queue_id_idx" ON "impl_prompt_handoffs" ("source_queue_id");
CREATE INDEX "impl_prompt_handoffs_status_idx" ON "impl_prompt_handoffs" ("status");

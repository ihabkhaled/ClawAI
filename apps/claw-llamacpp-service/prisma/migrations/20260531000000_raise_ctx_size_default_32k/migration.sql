-- Raise default ctx_size for resident llama-server from 8192 to 32768.
-- Root cause: 8K context window was truncating long prompts / multi-turn chats
-- (see .claude/Integrations/ollama_truncation_bug__report.md). 32K matches the
-- training-time context of the current frontier GGUFs (Kimi K2, GLM-5.1,
-- DeepSeek V3.2/V4) without exhausting host RAM at typical batch sizes.

-- AlterTable: change column default. Existing per-model overrides are kept
-- (this only affects rows inserted from now on; runtime-config.manager.ts
-- already reads LLAMACPP_DEFAULT_CTX_SIZE for fresh inserts).
ALTER TABLE "RuntimeConfig" ALTER COLUMN "ctxSize" SET DEFAULT 32768;

-- Harness council (research engine, 2026-11-27): models asked in parallel whether a turn needs research, how deep,
-- in which languages and with which sub-questions. Seeded rows come from AssistantModelService.onModuleInit (fills
-- a role only while it has no rows): beam, deepseek-v4.1-flash, mimo-v2.6-flash, minimax-m3.1-flash on Ollama Cloud.
ALTER TYPE "AssistantModelRole" ADD VALUE IF NOT EXISTS 'HARNESS_COUNCIL';

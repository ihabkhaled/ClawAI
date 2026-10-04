-- Where a provider serves OpenAI chat completions, relative to its base URL.
ALTER TABLE "connector_provider_definitions"
  ADD COLUMN "chat_completions_path" TEXT NOT NULL DEFAULT '/chat/completions';

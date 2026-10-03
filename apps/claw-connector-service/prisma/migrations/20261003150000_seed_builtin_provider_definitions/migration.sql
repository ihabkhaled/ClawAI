ALTER TABLE "connector_provider_definitions"
  ADD COLUMN "connector_provider" "ConnectorProvider";

ALTER TABLE "connector_provider_definitions"
  ALTER COLUMN "default_base_url" DROP NOT NULL,
  ALTER COLUMN "models_endpoint" DROP NOT NULL,
  ALTER COLUMN "models_response_format" DROP NOT NULL,
  ALTER COLUMN "auth_type" DROP NOT NULL;

CREATE UNIQUE INDEX "connector_provider_definitions_connector_provider_key"
  ON "connector_provider_definitions"("connector_provider");

INSERT INTO "connector_provider_definitions" (
  "id", "key", "display_name", "adapter_family", "connector_provider",
  "default_base_url", "models_endpoint", "models_response_format", "health_check_endpoint",
  "auth_type", "supports_native_tools", "default_is_pay_as_you_go", "has_free_tier",
  "is_active", "is_built_in", "capability_defaults", "updated_at"
) VALUES
  ('builtin-provider-openai', 'OPENAI', 'OpenAI', 'CODE_MANAGED', 'OPENAI', NULL, NULL, NULL, NULL, NULL, false, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-anthropic', 'ANTHROPIC', 'Anthropic', 'CODE_MANAGED', 'ANTHROPIC', NULL, NULL, NULL, NULL, NULL, false, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-gemini', 'GEMINI', 'Google Gemini', 'CODE_MANAGED', 'GEMINI', NULL, NULL, NULL, NULL, NULL, false, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-aws-bedrock', 'AWS_BEDROCK', 'AWS Bedrock', 'CODE_MANAGED', 'AWS_BEDROCK', NULL, NULL, NULL, NULL, NULL, false, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-deepseek', 'DEEPSEEK', 'DeepSeek', 'CODE_MANAGED', 'DEEPSEEK', NULL, NULL, NULL, NULL, NULL, false, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-ollama', 'OLLAMA', 'Ollama', 'CODE_MANAGED', 'OLLAMA', NULL, NULL, NULL, NULL, NULL, false, false, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-grok', 'GROK', 'Grok (xAI)', 'CODE_MANAGED', 'GROK', NULL, NULL, NULL, NULL, NULL, false, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-llamacpp', 'LLAMACPP', 'llama.cpp', 'CODE_MANAGED', 'LLAMACPP', NULL, NULL, NULL, NULL, NULL, false, false, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-openrouter', 'OPENROUTER', 'OpenRouter', 'OPENAI_COMPATIBLE', 'OPENROUTER', 'https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/models', 'OPENAI_LIST', 'https://openrouter.ai/api/v1/key', 'API_KEY', true, true, true, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-groq', 'GROQ', 'Groq', 'OPENAI_COMPATIBLE', 'GROQ', 'https://api.groq.com/openai/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, true, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-cerebras', 'CEREBRAS', 'Cerebras Inference', 'OPENAI_COMPATIBLE', 'CEREBRAS', 'https://api.cerebras.ai/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-sambanova', 'SAMBANOVA', 'SambaNova Cloud', 'OPENAI_COMPATIBLE', 'SAMBANOVA', 'https://api.sambanova.ai/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, true, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-deepinfra', 'DEEPINFRA', 'DeepInfra', 'OPENAI_COMPATIBLE', 'DEEPINFRA', 'https://api.deepinfra.com/v1/openai', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-fireworks', 'FIREWORKS', 'Fireworks AI', 'OPENAI_COMPATIBLE', 'FIREWORKS', 'https://api.fireworks.ai/inference/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-together', 'TOGETHER', 'Together AI', 'OPENAI_COMPATIBLE', 'TOGETHER', 'https://api.together.xyz/v1', '/models', 'BARE_ARRAY', '/models', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-mistral', 'MISTRAL', 'Mistral AI', 'OPENAI_COMPATIBLE', 'MISTRAL', 'https://api.mistral.ai/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, true, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-moonshot', 'MOONSHOT', 'Moonshot AI (Kimi)', 'OPENAI_COMPATIBLE', 'MOONSHOT', 'https://api.moonshot.ai/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-zai', 'ZAI', 'Z.ai (Zhipu GLM)', 'OPENAI_COMPATIBLE', 'ZAI', 'https://api.z.ai/api/paas/v4', NULL, 'OPENAI_LIST', '/models', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-qwen', 'QWEN', 'Alibaba Cloud Model Studio (Qwen)', 'OPENAI_COMPATIBLE', 'QWEN', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-cloudflare', 'CLOUDFLARE', 'Cloudflare Workers AI', 'OPENAI_COMPATIBLE', 'CLOUDFLARE', 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1', 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/models/search?task=Text%20Generation&per_page=100', 'CLOUDFLARE_SEARCH', 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/models/search?per_page=1', 'API_KEY', false, true, true, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-vercel-ai-gateway', 'VERCEL_AI_GATEWAY', 'Vercel AI Gateway', 'OPENAI_COMPATIBLE', 'VERCEL_AI_GATEWAY', 'https://ai-gateway.vercel.sh/v1', '/models', 'OPENAI_LIST', '/models', 'API_KEY', true, true, true, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-perplexity', 'PERPLEXITY', 'Perplexity Sonar', 'OPENAI_COMPATIBLE', 'PERPLEXITY', 'https://api.perplexity.ai', NULL, 'OPENAI_LIST', NULL, 'API_KEY', false, true, false, true, true, '{}', CURRENT_TIMESTAMP),
  ('builtin-provider-cohere', 'COHERE', 'Cohere', 'OPENAI_COMPATIBLE', 'COHERE', 'https://api.cohere.ai/compatibility/v1', 'https://api.cohere.com/v1/models?endpoint=chat&page_size=1000', 'COHERE_MODELS', 'https://api.cohere.com/v1/models?endpoint=chat&page_size=1', 'API_KEY', true, true, false, true, true, '{}', CURRENT_TIMESTAMP);

UPDATE "connectors" AS connector
SET "provider_definition_id" = definition."id"
FROM "connector_provider_definitions" AS definition
WHERE connector."provider_definition_id" IS NULL
  AND definition."connector_provider" = connector."provider";

WITH preset_links("key", "register_url", "api_key_url", "pricing_url", "docs_url") AS (
  VALUES
    ('OPENROUTER', 'https://openrouter.ai/sign-up', 'https://openrouter.ai/settings/keys', 'https://openrouter.ai/models', 'https://openrouter.ai/docs'),
    ('GROQ', 'https://console.groq.com', 'https://console.groq.com/keys', 'https://groq.com/pricing', 'https://console.groq.com/docs'),
    ('CEREBRAS', 'https://cloud.cerebras.ai', 'https://cloud.cerebras.ai', 'https://www.cerebras.ai/pricing', 'https://inference-docs.cerebras.ai'),
    ('SAMBANOVA', 'https://cloud.sambanova.ai', 'https://cloud.sambanova.ai/apis', 'https://cloud.sambanova.ai/plans/pricing', 'https://docs.sambanova.ai'),
    ('DEEPINFRA', 'https://deepinfra.com/login', 'https://deepinfra.com/dash/api_keys', 'https://deepinfra.com/pricing', 'https://deepinfra.com/docs'),
    ('FIREWORKS', 'https://fireworks.ai/login', 'https://app.fireworks.ai/settings/users/api-keys', 'https://fireworks.ai/pricing', 'https://docs.fireworks.ai'),
    ('TOGETHER', 'https://api.together.ai/signup', 'https://api.together.ai/settings/api-keys', 'https://www.together.ai/pricing', 'https://docs.together.ai'),
    ('MISTRAL', 'https://console.mistral.ai', 'https://console.mistral.ai/api-keys', 'https://mistral.ai/pricing', 'https://docs.mistral.ai'),
    ('MOONSHOT', 'https://platform.moonshot.ai', 'https://platform.moonshot.ai/console/api-keys', 'https://platform.moonshot.ai/docs/pricing/chat', 'https://platform.moonshot.ai/docs'),
    ('ZAI', 'https://z.ai/model-api', 'https://z.ai/manage-apikey/apikey-list', 'https://docs.z.ai/guides/overview/pricing', 'https://docs.z.ai'),
    ('QWEN', 'https://www.alibabacloud.com/product/model-studio', 'https://modelstudio.console.alibabacloud.com', 'https://www.alibabacloud.com/help/en/model-studio/models', 'https://www.alibabacloud.com/help/en/model-studio'),
    ('CLOUDFLARE', 'https://dash.cloudflare.com/sign-up', 'https://dash.cloudflare.com/profile/api-tokens', 'https://developers.cloudflare.com/workers-ai/platform/pricing/', 'https://developers.cloudflare.com/workers-ai/'),
    ('VERCEL_AI_GATEWAY', 'https://vercel.com/signup', 'https://vercel.com/dashboard', 'https://vercel.com/docs/ai-gateway/pricing', 'https://vercel.com/docs/ai-gateway'),
    ('PERPLEXITY', 'https://www.perplexity.ai', 'https://www.perplexity.ai/account/api', 'https://docs.perplexity.ai/getting-started/pricing', 'https://docs.perplexity.ai'),
    ('COHERE', 'https://dashboard.cohere.com/welcome/register', 'https://dashboard.cohere.com/api-keys', 'https://cohere.com/pricing', 'https://docs.cohere.com')
)
UPDATE "connector_provider_definitions" AS definition
SET "register_url" = preset_links."register_url",
    "api_key_url" = preset_links."api_key_url",
    "pricing_url" = preset_links."pricing_url",
    "docs_url" = preset_links."docs_url"
FROM preset_links
WHERE definition."key" = preset_links."key";

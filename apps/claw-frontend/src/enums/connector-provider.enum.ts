/**
 * Every provider a connector can be created for.
 *
 * The first eight have bespoke adapters. Everything after LLAMACPP is an
 * OpenAI-compatible preset: its base URL, links and model-list shape live in
 * one registry entry (`CONNECTOR_PRESETS` in `@claw/shared-utilities`).
 *
 * Kept in step with `packages/shared-types/src/enums/connector-provider.enum.ts`
 * (`tools/__tests__/connector-preset-single-source.test.mjs` fails when they drift).
 */
export enum ConnectorProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
  AWS_BEDROCK = 'AWS_BEDROCK',
  DEEPSEEK = 'DEEPSEEK',
  OLLAMA = 'OLLAMA',
  GROK = 'GROK',
  LLAMACPP = 'LLAMACPP',
  OPENROUTER = 'OPENROUTER',
  GROQ = 'GROQ',
  CEREBRAS = 'CEREBRAS',
  SAMBANOVA = 'SAMBANOVA',
  DEEPINFRA = 'DEEPINFRA',
  FIREWORKS = 'FIREWORKS',
  TOGETHER = 'TOGETHER',
  MISTRAL = 'MISTRAL',
  MOONSHOT = 'MOONSHOT',
  ZAI = 'ZAI',
  QWEN = 'QWEN',
  CLOUDFLARE = 'CLOUDFLARE',
  VERCEL_AI_GATEWAY = 'VERCEL_AI_GATEWAY',
  PERPLEXITY = 'PERPLEXITY',
  COHERE = 'COHERE',
}

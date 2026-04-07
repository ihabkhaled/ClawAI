import { z } from "zod";

export const LOCAL_PROVIDER = 'local-ollama';
export const LOCAL_MODEL_DEFAULT = 'tinyllama';

// Provider names must match the ConnectorProvider Prisma enum (uppercase)
export const CLOUD_PROVIDER_OPENAI = 'OPENAI';
export const CLOUD_PROVIDER_ANTHROPIC = 'ANTHROPIC';
export const CLOUD_PROVIDER_GEMINI = 'GEMINI';
export const CLOUD_PROVIDER_DEEPSEEK = 'DEEPSEEK';

export const CLOUD_MODEL_REASONING = 'claude-opus-4';
export const CLOUD_MODEL_FAST = 'gpt-4o-mini';
export const CLOUD_MODEL_CHEAP = 'gpt-4o-mini';
export const CLOUD_MODEL_DEFAULT = 'claude-sonnet-4';
export const CLOUD_MODEL_GEMINI_DEFAULT = 'gemini-2.5-flash';

export const VALID_PROVIDERS = new Set([
  LOCAL_PROVIDER,
  CLOUD_PROVIDER_OPENAI,
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_GEMINI,
  CLOUD_PROVIDER_DEEPSEEK,
]);

export const ollamaRouterResponseSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export const ROUTER_PROMPT_TEMPLATE = `You are a routing engine. Given a user message, decide which AI provider and model should answer it.

Available providers and models:
- local-ollama / tinyllama (free, local, fast for simple tasks, limited reasoning)
- OPENAI / gpt-4o-mini (fast, good general purpose, low cost)
- ANTHROPIC / claude-sonnet-4 (strong reasoning, good quality, medium cost)
- GEMINI / gemini-2.5-flash (fast, multimodal, low cost)
- DEEPSEEK / deepseek-chat (good reasoning, low cost)

Healthy providers: {healthyProviders}

Rules:
- For simple greetings, math, short Q&A: prefer local-ollama
- For complex reasoning, analysis, coding: prefer ANTHROPIC or OPENAI
- For cost-sensitive: prefer local-ollama or DEEPSEEK
- Only route to healthy providers
- If unsure, use OPENAI/gpt-4o-mini

Respond with ONLY a JSON object (no markdown, no explanation):
{{"provider":"...","model":"...","confidence":0.X,"reason":"brief reason"}}

User message: {message}`;

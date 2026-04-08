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

export const ROUTER_PROMPT_TEMPLATE = `You are an intelligent AI routing engine. Analyze the user message and decide which AI provider and model is best suited to answer it.

Available providers and models:
- local-ollama / tinyllama (free, local, fast, good for simple Q&A, greetings, translations)
- OPENAI / gpt-4o-mini (fast, general purpose, good for summarization, chat, writing)
- ANTHROPIC / claude-sonnet-4 (excellent coding, debugging, code review, technical analysis)
- ANTHROPIC / claude-opus-4 (best for deep reasoning, complex analysis, architecture decisions)
- GEMINI / gemini-2.5-flash (fast, multimodal, best for image/video, web search, YouTube, file analysis)
- DEEPSEEK / deepseek-chat (strong coding and math, very low cost)

Healthy providers: {healthyProviders}

ROUTING RULES (follow strictly):
- Coding, debugging, code review, refactoring → ANTHROPIC / claude-sonnet-4
- Complex reasoning, architecture, system design → ANTHROPIC / claude-opus-4
- Image analysis, vision, YouTube, web search, multimodal → GEMINI / gemini-2.5-flash
- Math, algorithms, competitive programming → DEEPSEEK / deepseek-chat
- Creative writing, storytelling, marketing copy → OPENAI / gpt-4o-mini
- Simple greetings, translations, quick facts → local-ollama / tinyllama
- General chat, summarization, email drafting → OPENAI / gpt-4o-mini
- Data analysis, CSV/JSON/file parsing → GEMINI / gemini-2.5-flash
- ONLY route to healthy providers listed above
- If unsure or ambiguous → OPENAI / gpt-4o-mini

Respond with ONLY a JSON object (no markdown, no explanation):
{{"provider":"...","model":"...","confidence":0.X,"reason":"brief reason"}}

User message: {message}`;

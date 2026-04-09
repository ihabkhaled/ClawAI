import { z } from 'zod';

export const LOCAL_PROVIDER = 'local-ollama';
export const LOCAL_MODEL_DEFAULT = 'gemma3:4b';
export const LOCAL_MODEL_ROUTER = 'gemma3:4b';
export const LOCAL_MODEL_FAST = 'tinyllama';

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

// Image generation providers
export const IMAGE_PROVIDER_OPENAI = 'IMAGE_OPENAI';
export const IMAGE_PROVIDER_GEMINI = 'IMAGE_GEMINI';
export const IMAGE_PROVIDER_LOCAL = 'IMAGE_LOCAL';
export const IMAGE_MODEL_DALLE3 = 'dall-e-3';
export const IMAGE_MODEL_IMAGEN = 'gemini-2.5-flash-image';
export const IMAGE_MODEL_SD_LOCAL = 'sdxl-turbo';

export const IMAGE_KEYWORDS = [
  'generate an image',
  'generate image',
  'generate a picture',
  'generate picture',
  'create an image',
  'create image',
  'create a picture',
  'create picture',
  'draw me',
  'draw a',
  'draw an',
  'draw the',
  'make an image',
  'make a picture',
  'make me an image',
  'make me a picture',
  'design an image',
  'design a logo',
  'sketch',
  'illustration of',
  'paint me',
  'paint a',
  'photo of',
  'photograph of',
  'render an image',
  'render a',
  'visualize',
  'depict',
];

// File generation provider
export const FILE_GENERATION_PROVIDER = 'FILE_GENERATION';

export const FILE_GENERATION_KEYWORDS = [
  'generate a file',
  'generate file',
  'create a pdf',
  'create pdf',
  'create a document',
  'create document',
  'export as',
  'export to',
  'save as',
  'download as',
  'generate a pdf',
  'generate pdf',
  'generate a document',
  'generate document',
  'write a file',
  'make a pdf',
  'make a document',
  'create a text file',
  'create a csv',
  'create csv',
  'generate csv',
  'create a json file',
  'generate json file',
  'export markdown',
  'create a report',
  'generate a report',
  'create a html',
  'generate html',
  'create a docx',
  'generate docx',
  'save to file',
  'write to file',
  'output as pdf',
  'output as file',
  'generate a text file',
  'create text file',
];

export const VALID_PROVIDERS = new Set([
  LOCAL_PROVIDER,
  CLOUD_PROVIDER_OPENAI,
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_GEMINI,
  CLOUD_PROVIDER_DEEPSEEK,
  IMAGE_PROVIDER_OPENAI,
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_LOCAL,
  FILE_GENERATION_PROVIDER,
]);

export const ollamaRouterResponseSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export const ROUTER_PROMPT_TEMPLATE = `You are an intelligent AI routing engine. Analyze the user message and decide which AI provider and model is best suited to answer it.

Available providers and models:

LOCAL MODELS (free, private, no internet needed):
- local-ollama / gemma3:4b (Google Gemma 3, 4B params, best local model for general chat and reasoning)
- local-ollama / llama3.2:3b (Meta Llama 3.2, 3B params, good local reasoning)
- local-ollama / phi3:mini (Microsoft Phi-3, 3.8B params, good for coding and math)
- local-ollama / gemma2:2b (Google Gemma 2, 2B params, fast local general purpose)
- local-ollama / tinyllama (1.1B params, very fast but limited, best for simple routing only)

CLOUD MODELS (paid, internet required, higher quality):
- OPENAI / gpt-4o-mini (fast, general purpose, good for summarization, chat, writing)
- ANTHROPIC / claude-sonnet-4 (excellent coding, debugging, code review, technical analysis)
- ANTHROPIC / claude-opus-4 (best for deep reasoning, complex analysis, architecture decisions)
- GEMINI / gemini-2.5-flash (fast, multimodal, best for image/video, web search, YouTube, file analysis)
- DEEPSEEK / deepseek-chat (strong coding and math, very low cost)

IMAGE GENERATION MODELS (generate images from text prompts):
- IMAGE_OPENAI / dall-e-3 (best quality, photorealistic images, DALL-E 3)
- IMAGE_GEMINI / gemini-2.5-flash-image (Google Gemini 2.5 image generation)
- IMAGE_LOCAL / sdxl-turbo (local Stable Diffusion, free, no internet, lower quality)

Healthy providers: {healthyProviders}

ROUTING RULES (follow strictly):
- Coding, debugging, code review, refactoring → ANTHROPIC / claude-sonnet-4
- Complex reasoning, architecture, system design → ANTHROPIC / claude-opus-4
- Image analysis, vision, YouTube, web search, multimodal → GEMINI / gemini-2.5-flash
- Math, algorithms, competitive programming → DEEPSEEK / deepseek-chat or local-ollama / phi3:mini
- Creative writing, storytelling, marketing copy → OPENAI / gpt-4o-mini
- Simple greetings, translations, quick facts → local-ollama / gemma3:4b
- General chat, summarization, email drafting → local-ollama / gemma3:4b or OPENAI / gpt-4o-mini
- Data analysis, CSV/JSON/file parsing → GEMINI / gemini-2.5-flash
- Image generation, drawing, creating pictures, illustrations, art, sketches → IMAGE_OPENAI / dall-e-3
- File generation, create PDF, export as CSV, save as file, generate document → FILE_GENERATION / auto
- Privacy-sensitive requests → local-ollama / gemma3:4b (never send to cloud)
- ONLY route to healthy providers listed above
- Prefer local models when quality is acceptable for the task
- If unsure or ambiguous → OPENAI / gpt-4o-mini

Respond with ONLY a JSON object (no markdown, no explanation):
{{"provider":"...","model":"...","confidence":0.X,"reason":"brief reason"}}

User message: {message}`;

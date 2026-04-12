import { LocalModelRole } from '@claw/shared-types';
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
  // Reference-based image generation phrases
  'generate similar',
  'similar to this',
  'like this image',
  'recreate this',
  'recreate the image',
  'reproduce this',
  'copy this image',
  'same style as',
  'based on this image',
  'inspired by this',
  'variation of this',
  'generate from this',
  'create from this',
  'make one like this',
  'make something like',
  'generate like this',
  'create similar',
  'similar image',
  'image like this',
  'remake this',
  'redo this image',
  // Scene/location prompts that imply image generation
  'fantasy map',
  'travel poster',
  'floor plan',
  'book cover',
  'album cover',
  'movie poster',
  'game character',
  'profile picture',
  'social media post',
  'app icon',
  // Single-word strong indicators
  'render ',
  'photo ',
  'portrait ',
  'illustration ',
  'poster ',
  'sticker ',
  'logo ',
  'banner ',
  'mascot ',
];

// File generation provider
export const FILE_GENERATION_PROVIDER = 'FILE_GENERATION';

// Regex-based file generation detection:
// Matches any combination of action verb + file format keyword
// e.g., "generate dummy pdf", "create a text file", "make me a csv report"
export const FILE_GENERATION_VERBS = [
  'generate',
  'create',
  'make',
  'write',
  'export',
  'save',
  'output',
  'produce',
  'build',
];
export const FILE_GENERATION_FORMAT_WORDS = [
  'file',
  'pdf',
  'document',
  'csv',
  'docx',
  'word',
  'txt',
  'text file',
  'markdown',
  'json',
  'html',
  'report',
  '.md',
  '.pdf',
  '.csv',
  '.docx',
  '.txt',
  '.json',
  '.html',
];

// Also keep exact phrases for high-confidence matches
export const FILE_GENERATION_KEYWORDS = [
  'export as',
  'export to',
  'save as',
  'download as',
  'save to file',
  'write to file',
  'output as file',
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

ROUTING RULES (follow strictly, in priority order):

IMAGE GENERATION (highest priority — detect these first):
- Any request to generate, create, draw, make, paint, render, design an image/picture/photo/portrait/illustration/sketch/art/logo/poster → IMAGE_GEMINI / gemini-2.5-flash-image
- "generate similar to this", "recreate this image", "make one like this" (referencing attached files) → IMAGE_GEMINI / gemini-2.5-flash-image
- "generate image", "create picture", "draw me", "make a photo" → IMAGE_GEMINI / gemini-2.5-flash-image

FILE GENERATION:
- Create/generate/export/save a file/document/PDF/CSV/DOCX/report → FILE_GENERATION / auto
- "generate text file", "create a PDF", "export as CSV" → FILE_GENERATION / auto

TEXT TASKS:
- Coding, debugging, code review, refactoring → ANTHROPIC / claude-sonnet-4
- Complex reasoning, architecture, system design → ANTHROPIC / claude-opus-4
- Image analysis, vision, describing attached images → GEMINI / gemini-2.5-flash
- Math, algorithms, competitive programming → DEEPSEEK / deepseek-chat or local-ollama / phi3:mini
- Creative writing, storytelling, marketing copy → OPENAI / gpt-4o-mini
- Simple greetings, translations, quick facts → local-ollama / gemma3:4b
- General chat, summarization, email drafting → local-ollama / gemma3:4b or OPENAI / gpt-4o-mini
- Data analysis, CSV/JSON/file parsing → GEMINI / gemini-2.5-flash
- Privacy-sensitive requests → local-ollama / gemma3:4b (never send to cloud)

GENERAL RULES:
- ONLY route to healthy providers listed above
- Prefer local models when quality is acceptable for the task
- When in doubt between image generation and text → check if the user wants a visual output
- If unsure or ambiguous → GEMINI / gemini-2.5-flash (best general purpose)

Respond with ONLY a JSON object (no markdown, no explanation):
{{"provider":"...","model":"...","confidence":0.X,"reason":"brief reason"}}

User message: {message}`;

export const CODING_KEYWORDS = [
  'code',
  'debug',
  'function',
  'refactor',
  'bug',
  'implement',
  'class',
  'method',
  'compile',
  'syntax',
  'error in my code',
  'write a function',
  'fix this bug',
  'code review',
  'pull request',
  'git',
  'api endpoint',
  'unit test',
  'integration test',
  'typescript',
  'javascript',
  'python',
  'react',
  'component',
  'database query',
  'sql',
  'algorithm',
  'data structure',
  'decorator',
  'middleware',
  'endpoint',
  'controller',
  'service',
  'repository',
  'migration',
  'schema',
  'query builder',
  'ORM',
  'REST',
  'GraphQL',
  'WebSocket',
  'microservice',
  'monorepo',
  'linting',
  'prettier',
  'webpack',
  'vite',
  'turbopack',
  'npm',
  'yarn',
  'pnpm',
  'package.json',
  'tsconfig',
  'dockerfile',
  'docker-compose',
  'CI/CD',
  'github actions',
  'jest',
  'vitest',
  'playwright',
  'cypress',
  'mocha',
  'chai',
  'supertest',
  'mock',
  'stub',
  'spy',
  'fixture',
  'snapshot',
  'coverage',
  'branch',
  'merge',
  'rebase',
  'cherry-pick',
  'stash',
  'commit',
  'pair programming',
  'clean code',
  'SOLID',
  'DRY',
  'KISS',
  'design pattern',
  'factory',
  'singleton',
  'observer',
  'strategy',
  'adapter',
  'dependency injection',
  'interface',
  'abstract class',
  'generic',
  'type',
  'enum',
  'async',
  'promise',
  'callback',
  'stream',
  'buffer',
  'event loop',
  'thread',
  'process',
  'worker',
  'cluster',
  'load balancer',
  'reverse proxy',
  'rate limit',
  'circuit breaker',
  'retry',
  'backoff',
  'cache',
  'Redis',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Prisma',
  'TypeORM',
  'Sequelize',
  'Mongoose',
];

export const REASONING_KEYWORDS = [
  'prove',
  'solve',
  'calculate',
  'analyze',
  'derive',
  'logic',
  'theorem',
  'equation',
  'mathematical',
  'probability',
  'statistics',
  'optimization',
  'constraint',
  'inference',
  'deduce',
  'hypothesis',
  'formal proof',
  'step by step',
  'chain of thought',
  'why does',
  'explain the reasoning',
];

export const THINKING_KEYWORDS = [
  'research',
  'search for',
  'find information',
  'investigate',
  'compare and contrast',
  'evaluate',
  'assess',
  'deep dive',
  'comprehensive analysis',
  'pros and cons',
  'trade-offs',
  'what are the options',
  'current state of',
  'latest developments',
  'how does X compare to Y',
];

export const INFRASTRUCTURE_KEYWORDS = [
  'terraform',
  'ansible',
  'kubernetes',
  'k8s',
  'helm',
  'docker',
  'container',
  'pod',
  'deployment',
  'service mesh',
  'istio',
  'envoy',
  'nginx',
  'apache',
  'SSL',
  'TLS',
  'certificate',
  'DNS',
  'CDN',
  'cloudflare',
  'AWS',
  'GCP',
  'Azure',
  'EC2',
  'S3',
  'Lambda',
  'serverless',
  'VPC',
  'subnet',
  'security group',
  'IAM',
  'auto scaling',
  'ECS',
  'EKS',
  'fargate',
];

export const DATA_ANALYSIS_KEYWORDS = [
  'dataset',
  'dataframe',
  'pandas',
  'numpy',
  'matplotlib',
  'seaborn',
  'plotly',
  'chart',
  'graph',
  'visualization',
  'pivot table',
  'aggregation',
  'GROUP BY',
  'JOIN',
  'window function',
  'CTE',
  'subquery',
  'ETL',
  'pipeline',
  'data warehouse',
  'BigQuery',
  'Redshift',
  'Snowflake',
  'dbt',
  'Airflow',
  'Spark',
  'Hadoop',
  'Kafka',
  'data lake',
  'schema design',
  'normalization',
  'denormalization',
  'OLAP',
  'OLTP',
];

export const BUSINESS_KEYWORDS = [
  'user story',
  'acceptance criteria',
  'sprint',
  'backlog',
  'roadmap',
  'KPI',
  'OKR',
  'conversion rate',
  'funnel',
  'A/B test',
  'campaign',
  'ROI',
  'revenue',
  'budget',
  'forecast',
  'market analysis',
  'competitor',
  'SWOT',
  'business case',
  'proposal',
  'RFP',
  'pitch deck',
  'stakeholder',
  'quarterly review',
  'board meeting',
  'executive summary',
  'strategic plan',
  'go-to-market',
  'pricing strategy',
  'churn rate',
];

export const CREATIVE_WRITING_KEYWORDS = [
  'blog post',
  'article',
  'essay',
  'story',
  'poem',
  'haiku',
  'screenplay',
  'script',
  'dialogue',
  'narrative',
  'character',
  'plot',
  'setting',
  'tone',
  'voice',
  'style',
  'headline',
  'tagline',
  'slogan',
  'copywriting',
  'social media post',
  'caption',
  'newsletter',
  'email campaign',
  'press release',
  'ad copy',
];

export const SECURITY_KEYWORDS = [
  'vulnerability',
  'CVE',
  'exploit',
  'penetration test',
  'pentest',
  'XSS',
  'SQL injection',
  'CSRF',
  'SSRF',
  'RCE',
  'buffer overflow',
  'privilege escalation',
  'authentication bypass',
  'OWASP',
  'security audit',
  'threat model',
  'encryption',
  'hashing',
  'firewall',
  'WAF',
  'IDS',
  'IPS',
  'SIEM',
  'SOC',
  'incident response',
];

export const MEDICAL_KEYWORDS = [
  'clinical',
  'patient',
  'diagnosis',
  'treatment',
  'symptom',
  'medication',
  'dosage',
  'ICD-10',
  'CPT code',
  'HIPAA',
  'PHI',
  'medical record',
  'lab result',
  'radiology',
  'pathology',
  'prognosis',
  'clinical trial',
  'adverse event',
  'contraindication',
];

export const LEGAL_KEYWORDS = [
  'contract',
  'clause',
  'NDA',
  'liability',
  'indemnification',
  'jurisdiction',
  'statute',
  'case law',
  'precedent',
  'plaintiff',
  'defendant',
  'deposition',
  'discovery',
  'compliance',
  'GDPR',
  'SOC2',
  'regulatory',
  'intellectual property',
  'trademark',
  'patent',
  'copyright',
];

export const TRANSLATION_KEYWORDS = [
  'translate',
  'translation',
  'localize',
  'localization',
  'i18n',
  'multilingual',
  'language',
  'convert to English',
  'convert to Arabic',
  'convert to Spanish',
  'convert to French',
  'convert to German',
];

export const PRIVACY_KEYWORDS = [
  'medical',
  'patient',
  'diagnosis',
  'health record',
  'PHI',
  'HIPAA',
  'tax return',
  'salary',
  'SSN',
  'social security',
  'credit card',
  'bank account',
  'password',
  'private key',
  'secret',
  'confidential',
  'NDA',
  'attorney-client',
  'privilege',
  'personal data',
  'PII',
  'financial statement',
  'investment portfolio',
  'insurance claim',
  'disability',
  'mental health',
  'therapy',
  'counseling',
  'genetic',
  'criminal record',
  'employment contract',
  'credit report',
  'prenuptial',
  'personal spending',
  'divorce',
  'custody',
  'alimony',
  'mortgage application',
  'bankruptcy',
  'loan application',
  'background check',
  'drug test',
  'performance review',
  'termination',
  'severance',
  'whistleblower',
  'harassment',
  'discrimination',
];

export const CATEGORY_TO_ROLE_MAP: Record<string, LocalModelRole> = {
  coding: LocalModelRole.LOCAL_CODING,
  reasoning: LocalModelRole.LOCAL_REASONING,
  thinking: LocalModelRole.LOCAL_THINKING,
  chat: LocalModelRole.LOCAL_FALLBACK_CHAT,
  'image-generation': LocalModelRole.LOCAL_IMAGE_GENERATION,
  'file-generation': LocalModelRole.LOCAL_FILE_GENERATION,
  infrastructure: LocalModelRole.LOCAL_CODING,
  'data-analysis': LocalModelRole.LOCAL_REASONING,
  business: LocalModelRole.LOCAL_FILE_GENERATION,
  'creative-writing': LocalModelRole.LOCAL_FALLBACK_CHAT,
  security: LocalModelRole.LOCAL_CODING,
  medical: LocalModelRole.LOCAL_REASONING,
  legal: LocalModelRole.LOCAL_REASONING,
  translation: LocalModelRole.LOCAL_FALLBACK_CHAT,
};

export const CONFIDENCE_EXACT_KEYWORD = 0.95;
export const CONFIDENCE_VERB_NOUN_COMBO = 0.90;
export const CONFIDENCE_CATEGORY_KEYWORD = 0.85;
export const CONFIDENCE_HEURISTIC_FALLBACK = 0.60;
export const CONFIDENCE_PRIVACY_ENFORCED = 0.95;

export const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000;

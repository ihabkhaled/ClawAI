/** Severities that count as a failure on the Observability page. */
export const FAILURE_SEVERITIES: readonly string[] = ['HIGH', 'CRITICAL'];

/** Workspace-sync bookkeeping actions (`SYNC_RUN_FAILED`, ...). Labelled separately, excluded by default. */
export const SYNC_NOISE_ACTION_PATTERN = '^SYNC_';
export const SYNC_NOISE_REGEX = new RegExp(SYNC_NOISE_ACTION_PATTERN);

/** Actions that signal a retry, fallback or breaker trip, for the tracing summary. */
export const TRACING_SIGNAL_ACTION_PATTERN = 'FALLBACK|RETRY|CIRCUIT_BREAKER|RATE_LIMITED';

export const OBSERVABILITY_DEFAULT_HOURS = 24;
export const OBSERVABILITY_MAX_HOURS = 720;
export const OBSERVABILITY_DEFAULT_LIMIT = 20;
export const OBSERVABILITY_MAX_LIMIT = 100;
export const OBSERVABILITY_SEARCH_MAX_LENGTH = 100;

/** Rows in each small leaderboard (entity types, providers, models, signals). */
export const OBSERVABILITY_TOP_N = 10;
export const OBSERVABILITY_SIGNALS_TOP_N = 20;

/** Hard server-side time limit on every aggregation, in milliseconds. */
export const OBSERVABILITY_MAX_TIME_MS = 20_000;

export const USAGE_MESSAGE_COMPLETED_ACTION = 'message.completed';

/** Percentiles reported by the tracing summary, in order. */
export const TRACING_PERCENTILES: readonly number[] = [0.5, 0.95];

export const MS_PER_HOUR = 3_600_000;

/** Escapes regex metacharacters so search text matches literally. */
export const REGEX_ESCAPE_PATTERN = /[.*+?^${}()|[\]\\]/g;

export const UNKNOWN_LABEL = 'UNKNOWN';

/** Routing keys auth-service publishes when an admin reads user consumption. */
export const ADMIN_USAGE_VIEWED_EVENT = 'admin.usage.viewed';
export const ADMIN_USAGE_EXPORTED_EVENT = 'admin.usage.exported';

export const ADMIN_USAGE_AUDIT_ACTIONS = {
  VIEWED: 'ADMIN_USER_USAGE_VIEWED',
  EXPORTED: 'ADMIN_USER_USAGE_EXPORTED',
} as const;

/** Normalised provider key to display label. Keys not listed are title-cased. */
export const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Google Gemini',
  AWS_BEDROCK: 'AWS Bedrock',
  DEEPSEEK: 'DeepSeek',
  OLLAMA: 'Ollama',
  LOCAL_OLLAMA: 'Local Ollama',
  OLLAMA_CLOUD: 'Ollama Cloud',
  GROK: 'xAI Grok',
  LLAMACPP: 'llama.cpp (local)',
  OPENROUTER: 'OpenRouter',
  GROQ: 'Groq',
  ZAI: 'Z.ai',
  VERCEL_AI_GATEWAY: 'Vercel AI Gateway',
  CUSTOM_OPENAI_COMPATIBLE: 'Custom (OpenAI-compatible)',
  CLAW: 'ClawAI (platform)',
};

export const PROVIDER_NON_ALNUM_PATTERN = /[^A-Za-z0-9]+/g;

/** Tracing sort option to the grouped document field it orders by. */
export const TRACING_SORT_FIELDS: Readonly<Record<string, string>> = {
  requests: 'requests',
  p95: 'p95',
  tokens: 'totalTokens',
};

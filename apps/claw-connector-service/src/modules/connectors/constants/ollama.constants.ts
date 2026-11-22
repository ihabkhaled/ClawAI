export const OLLAMA_DEFAULT_BASE_URL = 'http://ollama:11434';
export const OLLAMA_LOCALHOST_PATTERNS = ['localhost', '127.0.0.1', '0.0.0.0'];
export const OLLAMA_CLOUD_API_BASE_URL = 'https://ollama.com/api';

export const OLLAMA_CATALOG_CLOUD_URL = 'https://ollama.com/search?c=cloud';
export const OLLAMA_CATALOG_POPULAR_URL = 'https://ollama.com/library?sort=popular';
export const OLLAMA_CATALOG_LIBRARY_LINK_REGEX = /href="\/library\/([a-z0-9][a-z0-9._-]*)"/gi;
export const OLLAMA_CATALOG_MAX_MODELS = 250;
export const OLLAMA_CATALOG_USER_AGENT =
  'Mozilla/5.0 (compatible; ClawAI-ConnectorService/1.0; +https://ollama.com)';
export const OLLAMA_CLOUD_TAG = 'cloud';
export const OLLAMA_DEFAULT_TAG = 'latest';

// `POST /api/show` window lookup at sync, for models the curated table has no
// window for. Bounded on every axis so a slow or large catalog can never stall
// or fail a sync: a lookup that does not finish leaves the window unknown.
export const OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX = '.context_length';
export const OLLAMA_SHOW_CONCURRENCY = 4;
export const OLLAMA_SHOW_TIMEOUT_MS = 5_000;
export const OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC = 100;
export const OLLAMA_SHOW_SYNC_BUDGET_MS = 30_000;
export const OLLAMA_SHOW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const OLLAMA_SHOW_FAILURE_RETRY_MS = 60 * 60 * 1000;

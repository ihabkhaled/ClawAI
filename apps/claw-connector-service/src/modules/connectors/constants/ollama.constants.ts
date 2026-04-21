export const OLLAMA_DEFAULT_BASE_URL = 'http://ollama:11434';
export const OLLAMA_LOCALHOST_PATTERNS = ['localhost', '127.0.0.1', '0.0.0.0'];

export const OLLAMA_CATALOG_CLOUD_URL = 'https://ollama.com/search?c=cloud';
export const OLLAMA_CATALOG_POPULAR_URL = 'https://ollama.com/library?sort=popular';
export const OLLAMA_CATALOG_LIBRARY_LINK_REGEX = /href="\/library\/([a-z0-9][a-z0-9._-]*)"/gi;
export const OLLAMA_CATALOG_MAX_MODELS = 250;
export const OLLAMA_CATALOG_USER_AGENT =
  'Mozilla/5.0 (compatible; ClawAI-ConnectorService/1.0; +https://ollama.com)';
export const OLLAMA_CLOUD_TAG = 'cloud';
export const OLLAMA_DEFAULT_TAG = 'latest';

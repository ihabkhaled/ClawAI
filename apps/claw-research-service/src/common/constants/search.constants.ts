export const SEARCH_DEFAULT_MAX_RESULTS = 10;
export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 500;
export const SEARCH_MAX_MAX_RESULTS = 25;
export const SEARCH_DEFAULT_TIMEOUT_MS = 15_000;
export const HEALTH_CHECK_TIMEOUT_MS = 5_000;

/** Tavily Search API. */
export const TAVILY_API_DEFAULT_BASE = 'https://api.tavily.com';
export const TAVILY_SEARCH_PATH = '/search';
/** Ollama Web Search API (matches the standalone `webSearch` endpoint). */
export const OLLAMA_WEB_SEARCH_DEFAULT_BASE = 'https://ollama.com';
export const OLLAMA_WEB_SEARCH_PATH = '/api/web_search';
/** SearXNG JSON endpoint shape. */
export const SEARXNG_SEARCH_PATH = '/search';

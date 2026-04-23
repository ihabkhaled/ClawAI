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
/** Exa Search API. */
export const EXA_API_DEFAULT_BASE = 'https://api.exa.ai';
export const EXA_SEARCH_PATH = '/search';
/** Firecrawl Search API. */
export const FIRECRAWL_API_DEFAULT_BASE = 'https://api.firecrawl.dev';
export const FIRECRAWL_SEARCH_PATH = '/v2/search';
/** Brave Search API. */
export const BRAVE_SEARCH_API_DEFAULT_BASE = 'https://api.search.brave.com';
export const BRAVE_SEARCH_PATH = '/res/v1/web/search';
/** SerpApi Google Search API. */
export const SERPAPI_DEFAULT_BASE = 'https://serpapi.com';
export const SERPAPI_SEARCH_PATH = '/search.json';

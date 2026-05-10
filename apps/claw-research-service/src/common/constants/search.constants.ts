import { SearchProviderKind } from '../enums/search-provider-kind.enum';

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

/**
 * Provider-kind → score lookups consumed by SearchExecutionService.scoreProvider.
 * Keep both maps in sync with the SearchProviderKind enum. Higher score wins
 * when the AUTO selection mode picks a primary candidate.
 */
export const FETCH_EXTRACT_PROVIDER_SCORES: ReadonlyMap<string, number> = new Map<string, number>([
  [SearchProviderKind.FIRECRAWL, 100],
  [SearchProviderKind.EXA, 90],
  [SearchProviderKind.BRAVE, 80],
  [SearchProviderKind.TAVILY, 70],
  [SearchProviderKind.SERPAPI, 60],
  [SearchProviderKind.SEARXNG, 50],
  [SearchProviderKind.OLLAMA_WEB, 40],
]);

export const DEFAULT_PROVIDER_SCORES: ReadonlyMap<string, number> = new Map<string, number>([
  [SearchProviderKind.EXA, 100],
  [SearchProviderKind.BRAVE, 90],
  [SearchProviderKind.TAVILY, 80],
  [SearchProviderKind.SERPAPI, 70],
  [SearchProviderKind.FIRECRAWL, 65],
  [SearchProviderKind.SEARXNG, 60],
  [SearchProviderKind.OLLAMA_WEB, 50],
]);

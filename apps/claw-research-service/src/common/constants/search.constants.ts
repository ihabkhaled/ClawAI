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

/**
 * Longest INTENT a research run will accept.
 *
 * Separate from `SEARCH_MAX_QUERY_LENGTH`, and the distinction is the point. A
 * search query is what reaches the provider and 500 characters is a real limit
 * there. An intent is the user's prompt, which is routinely longer — and a
 * prompt of 1,200 characters used to 400 the whole run, so `runResearch`
 * returned null, no transcript was produced, no warning was raised, and the
 * model was told nothing about the web at all. **Research was silently disabled
 * by writing a long message.**
 *
 * The intent is now accepted whole (URLs are detected from all of it) and only
 * the derived search query is clamped, with a warning.
 */
export const RESEARCH_MAX_INTENT_LENGTH = 8_000;

/**
 * AUTO search runs EVERY enabled + ACTIVE provider in parallel and waits for
 * all of them to settle (ADR-210). Each provider is bound by its own
 * `timeoutMs`, never by more than this ceiling, so the slowest provider can
 * delay the answer by at most this long.
 */
export const SEARCH_AUTO_CEILING_MS = 20_000;

/** Rank smoothing K in `(K+1)/(K+rank)`: rank 1 scores 1, rank 10 about 0.55. */
export const SEARCH_RANK_SMOOTHING = 10;
/** Score added per additional provider that returned the same page. */
export const SEARCH_AGREEMENT_BONUS = 0.05;

/** Consecutive failures before a provider's breaker opens (per process). */
export const SEARCH_BREAKER_FAILURE_THRESHOLD = 3;
/** How long an open breaker skips a provider before one probe is allowed. */
export const SEARCH_BREAKER_COOLDOWN_MS = 30_000;
/** Upper bound on providers tracked by the breaker map. */
export const SEARCH_BREAKER_MAX_TRACKED = 200;

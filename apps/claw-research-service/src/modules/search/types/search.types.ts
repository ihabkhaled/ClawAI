import type { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import type { ExecuteSearchDto } from '../dto/execute-search.dto';

/** Single normalized search result. Every adapter must produce this shape. */
export type SearchResult = {
  /** Stable id within one run (hash of url). Used for dedupe. */
  id: string;
  title: string;
  url: string;
  /** Short snippet / description from the search provider. */
  snippet: string | null;
  /** Optional publish date (ISO string). */
  publishedAt: string | null;
  /** Provider-reported freshness score or null if not available. */
  freshness: string | null;
  /** Score used for ranking (0..1, higher is better). */
  score: number;
  /** Origin provider kind — useful when results are merged across providers. */
  providerKind: SearchProviderKind;
  /** Every provider (by name) that returned this page after a merge (ADR-210). */
  providers?: string[];
  /** Raw provider payload (may contain extra fields). */
  raw?: Record<string, unknown>;
};

export type SearchRequest = {
  query: string;
  maxResults: number;
  /** Provider-specific filters — domain, lang, freshness, etc. */
  filters?: Record<string, unknown>;
  /** Results to skip: SerpApi's `start` for a deeper Google page (10, 20, ...). Absent = the first page. */
  start?: number;
};

/**
 * A search the service itself sends (never the public route's body): `start` is the SerpApi offset of a deeper
 * Google page (ADR-228). The public `ExecuteSearchDto` has no such field, so a caller cannot page.
 */
export type PagedSearchDto = ExecuteSearchDto & { start?: number };

export type SearchResponse = {
  results: SearchResult[];
  latencyMs: number;
  warnings?: string[];
};

export type ResultSetQuality = {
  bestScore: number;
  averageTopScore: number;
};

/** Result of a health probe against a provider. */
export type ProviderHealthResult = {
  healthy: boolean;
  latencyMs: number;
  errorMessage?: string;
};

/** Decrypted provider credentials passed to adapters at call time. */
export type SearchAdapterCredentials = {
  apiKey?: string;
  username?: string;
  password?: string;
  extra?: Record<string, string>;
};

/** Non-secret provider config from `SearchProvider.publicConfig`. */
export type SearchAdapterPublicConfig = Record<string, unknown>;

export type SearchAdapterContext = {
  baseUrl: string;
  credentials: SearchAdapterCredentials;
  publicConfig: SearchAdapterPublicConfig;
  timeoutMs: number;
  /** Fail-soft accounting hook invoked once immediately before each search network request. */
  onNetworkCall?: () => Promise<void>;
};

import type { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';

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
  /** Raw provider payload (may contain extra fields). */
  raw?: Record<string, unknown>;
};

export type SearchRequest = {
  query: string;
  maxResults: number;
  /** Provider-specific filters — domain, lang, freshness, etc. */
  filters?: Record<string, unknown>;
};

export type SearchResponse = {
  results: SearchResult[];
  latencyMs: number;
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
};

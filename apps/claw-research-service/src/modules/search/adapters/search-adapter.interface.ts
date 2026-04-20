import type { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
} from '../types/search.types';

/**
 * Every search adapter implements this contract. Adapters are stateless —
 * they receive per-call context (credentials, publicConfig, baseUrl,
 * timeoutMs) resolved from the DB at runtime. Adapters MUST NOT read
 * credentials from env.
 */
export interface SearchAdapter {
  /** Which `SearchProviderKind` this adapter serves. */
  readonly kind: SearchProviderKind;

  /** Validate that the provider accepts the configured credentials. */
  healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult>;

  /** Execute a search and return normalized results. */
  search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse>;
}

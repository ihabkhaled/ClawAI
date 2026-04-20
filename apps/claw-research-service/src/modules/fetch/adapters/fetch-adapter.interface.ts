import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Web fetch adapter. Currently only a single generic HTTP implementation;
 * future adapters may provide headless-browser fetches or domain-specific
 * optimizations.
 */
export interface FetchAdapter {
  fetchPage(request: FetchRequest): Promise<FetchResult>;
}

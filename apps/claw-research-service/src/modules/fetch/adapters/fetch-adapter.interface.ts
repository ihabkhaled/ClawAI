import type { FetchRequest, FetchResult } from '../types/fetch.types';

/**
 * Web fetch adapter: one way of turning a URL into a `FetchResult`. Every
 * implementation is also a `FetchStrategyAdapter` in the escalation chain
 * (ADR-121); this base interface is what a caller that only fetches needs.
 */
export interface FetchAdapter {
  fetchPage(request: FetchRequest): Promise<FetchResult>;
}

import type { SearchResult } from './search.types';

export type SearchExecutionResult = {
  runId: string;
  providerId: string;
  providerName: string;
  providerKind: string;
  query: string;
  results: SearchResult[];
  latencyMs: number;
  warnings?: string[];
};

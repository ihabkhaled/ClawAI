import type { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import type { SearchResult } from './search.types';

export type SearchExecutionResult = {
  runId: string;
  providerId: string;
  providerName: string;
  providerKind: string;
  selectionMode: ProviderSelectionMode;
  fallbackUsed: boolean;
  attemptedProviders: string[];
  query: string;
  results: SearchResult[];
  latencyMs: number;
  warnings?: string[];
};

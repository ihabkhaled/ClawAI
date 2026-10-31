import type { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import type { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import type { SearchExecutionMode } from '../../../common/enums/search-execution-mode.enum';
import type { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';
import type { SearchResult } from './search.types';

/** One provider's part in one search. Never carries a URL, secret or error body. */
export type SearchProviderOutcome = {
  name: string;
  kind: string;
  status: SearchProviderRunStatus;
  latencyMs: number;
  resultCount: number;
  errorCode: ResearchErrorCode | null;
};

export type SearchExecutionResult = {
  runId: string;
  providerId: string;
  providerName: string;
  providerKind: string;
  selectionMode: ProviderSelectionMode;
  /** Additive (ADR-210): AUTO_ALL when every enabled provider ran, EXPLICIT when one was named. */
  mode: SearchExecutionMode;
  /** Additive (ADR-210): one entry per provider considered, in rank order. */
  providers: SearchProviderOutcome[];
  fallbackUsed: boolean;
  attemptedProviders: string[];
  searchRequestCount: number;
  query: string;
  results: SearchResult[];
  latencyMs: number;
  warnings?: string[];
};

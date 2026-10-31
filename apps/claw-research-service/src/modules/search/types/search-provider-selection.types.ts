import type { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import type { SearchExecutionMode } from '../../../common/enums/search-execution-mode.enum';
import type { SearchProvider } from '../../../generated/prisma';
import type { SearchProviderOutcome } from './search-execution-result.types';
import type { SearchResult } from './search.types';

export type ProviderSelection = {
  primary: SearchProvider;
  candidates: SearchProvider[];
  mode: ProviderSelectionMode;
  executionMode: SearchExecutionMode;
};

export type ProviderCallEntry = {
  provider: SearchProvider;
  outcome: SearchProviderOutcome;
  /** null = the provider contributed nothing (failed, timed out or skipped). */
  results: SearchResult[] | null;
  providerWarnings: string[];
};

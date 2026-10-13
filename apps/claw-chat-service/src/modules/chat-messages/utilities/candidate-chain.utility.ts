import type { CandidateChainState } from '../types/execution-outcome.types';

/** A fresh pass down the candidate chain: nothing tried, nothing refused. */
export function newCandidateChainState(): CandidateChainState {
  return {
    lastError: null,
    reRouteAttempt: 0,
    reRouteReasons: [],
    attempts: [],
    failedProviders: new Set<string>(),
    substituteAttempts: 0,
    creditRefusedProviders: new Set<string>(),
    creditRefusal: null,
    creditRefusalRecord: null,
    creditGone: false,
  };
}

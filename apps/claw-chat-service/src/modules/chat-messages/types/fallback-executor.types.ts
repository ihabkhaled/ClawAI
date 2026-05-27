// FallbackExecutor — Phase 5 of the semantic router flagship
// (docs/03-architecture/semantic-router-flagship-plan.md §5).
//
// AttemptRecord captures per-attempt telemetry for the developer drawer
// ("Why did this fall back? Which model tried first? How long did each
// take?"). Shadow when ROUTING_FALLBACK_ATTEMPTS_ENABLED=false (still
// recorded for observability), promoted to drive the LlmResponse drawer
// when true.

export type FallbackAttemptStatus =
  | 'SUCCESS'
  | 'FAILURE'
  | 'RE_ROUTE'
  | 'SKIPPED_QUALITY';

export type AttemptRecord = {
  attemptIndex: number;
  provider: string;
  model: string;
  startedAt: string;
  durationMs: number;
  status: FallbackAttemptStatus;
  qualityScore?: number | null;
  qualityReasons?: string[];
  errorMessage?: string | null;
  errorCode?: string | null;
};

export type FallbackChainOutcome<TResponse> =
  | { kind: 'success'; response: TResponse; attempts: AttemptRecord[] }
  | { kind: 'exhausted'; lastError: unknown; attempts: AttemptRecord[] };

export type FallbackCandidate = {
  provider: string;
  model: string;
};

// Result the per-candidate callback returns so the executor can decide
// whether to move on or stop. `qualityScore` is optional — when omitted
// the executor treats SUCCESS as terminal (no quality gate applied).
export type CandidateCallbackResult<TResponse> =
  | {
      status: 'SUCCESS';
      response: TResponse;
      qualityScore?: number | null;
      qualityReasons?: string[];
    }
  | {
      status: 'RE_ROUTE';
      qualityScore?: number | null;
      qualityReasons?: string[];
      errorMessage?: string;
    }
  | {
      status: 'FAILURE';
      error: unknown;
      errorMessage?: string;
      errorCode?: string;
    };

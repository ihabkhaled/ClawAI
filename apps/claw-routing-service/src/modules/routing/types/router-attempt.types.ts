import type { RouterProvider } from '../../../generated/prisma';

/** One persisted router-inference attempt. Safe codes only, never a payload. */
export interface ProviderAttemptRecord {
  traceId: string;
  /** Null until the decision row exists, or forever if the walk produced none. */
  decisionId: string | null;
  attemptOrder: number;
  chainEntryId: string | null;
  chainOrder: number | null;
  provider: RouterProvider;
  providerModelId: string;
  deploymentId: string | null;
  succeeded: boolean;
  /** Canonical RouterErrorCode name. Null on success. */
  errorCode: string | null;
  safeMessage: string | null;
  wasRepair: boolean;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
}

/** One candidate's ranking for one decision. */
export interface CandidateScoreRecord {
  traceId: string;
  decisionId: string | null;
  deploymentId: string;
  provider: RouterProvider;
  providerModelId: string;
  eligible: boolean;
  /** Safe exclusion code when not eligible. */
  exclusionReason: string | null;
  score: number | null;
  uncertainty: number | null;
  /** Per-factor contributions keyed by factor code. */
  factors: Record<string, number> | null;
  rank: number | null;
}

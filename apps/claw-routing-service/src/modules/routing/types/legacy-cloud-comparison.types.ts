import type { ExcludedChainEntry } from './router-chain-resolution.types';

/**
 * One derived, redacted judge/critic/evaluator signal.
 *
 * Always stamped with the rubric version it was read against
 * (`ROUTING_JUDGE_RUBRIC_VERSION`), so a future re-scoring under a different
 * rubric never silently mixes with scores read under this one.
 * `available: false` is not an error — a shadow cloud decision was never
 * served, so it can never have been judged, and the comparison says so
 * explicitly (`unavailableReason`) rather than omitting the field.
 */
export interface ComparisonQualitySignal {
  evaluatorVersion: string;
  available: boolean;
  unavailableReason?: string;
  judgeOutcome?: string;
  judgeConfidence?: number;
  criticScore?: number;
}

export interface ComparisonCostSignal {
  available: boolean;
  unavailableReason?: string;
  costClass?: string;
}

export interface ComparisonLatencySignal {
  available: boolean;
  latencyMs?: number;
}

/** Whether the routing engine itself failed to produce a usable decision. */
export interface ComparisonFailureSignal {
  failed: boolean;
  code?: string;
  safeMessage?: string;
}

export interface LegacyRouteSummary {
  provider: string;
  model: string;
  confidence: number | null;
  /** What shaped this pick — the closest legacy analog to "constraints". */
  reasonTags: string[];
  privacyClass: string | null;
  quality: ComparisonQualitySignal;
  cost: ComparisonCostSignal;
  latency: ComparisonLatencySignal;
  failure: ComparisonFailureSignal;
}

export interface CloudRouteSummary {
  available: boolean;
  unavailableReason?: string;
  provider?: string;
  model?: string;
  deploymentId?: string;
  confidence?: number;
  workflow?: string;
  /** What the cloud router excluded before ever walking the chain, and why. */
  excluded: readonly ExcludedChainEntry[];
  quality: ComparisonQualitySignal;
  cost: ComparisonCostSignal;
  latency: ComparisonLatencySignal;
  failure: ComparisonFailureSignal;
}

/**
 * One historical `RoutingDecision` replayed as a CHALLENGER through
 * `CloudRouterManager.route()` in shadow mode, compared against the legacy
 * decision that was actually served.
 *
 * Never carries `messageContent` — only a truncated preview, matching the
 * redaction discipline `ReplayManager` already applies and the "safe
 * evidence only" contract `RouterTraceEvent` documents.
 */
export interface LegacyVsCloudComparison {
  decisionId: string;
  messagePreview: string;
  /** Same provider AND model, case-insensitively (provider is a free-form String column). */
  choiceAgrees: boolean;
  evaluatorVersion: string;
  comparedAt: string;
  legacy: LegacyRouteSummary;
  cloud: CloudRouteSummary;
}

export interface LegacyVsCloudBatchResult {
  totalCompared: number;
  cloudAvailableCount: number;
  cloudAgreesCount: number;
  cloudFailedCount: number;
  agreementRate: number;
  evaluatorVersion: string;
  results: LegacyVsCloudComparison[];
}

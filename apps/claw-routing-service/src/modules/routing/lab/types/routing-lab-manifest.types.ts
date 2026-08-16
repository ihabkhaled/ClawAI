import type { RouterErrorCode, RoutingLabCaseCategory } from '../../../../common/enums';

export interface RoutingLabPassDeclineBreakdown {
  readonly passed: number;
  /** `available: false` — declined before a provider was ever called. */
  readonly declinedUnavailable: number;
  /** `available: true`, chain exhausted with no trustworthy decision. */
  readonly declinedChainExhausted: number;
  readonly declinedByReason: Readonly<Record<string, number>>;
  readonly declinedByFinalErrorCode: Readonly<Partial<Record<RouterErrorCode, number>>>;
}

export interface RoutingLabFallbackDepthBreakdown {
  /** Successful decisions only, keyed by `fallbackDepth`. */
  readonly histogram: Readonly<Record<number, number>>;
  readonly averageDepth: number;
  readonly maxDepth: number;
  readonly successCount: number;
}

export interface RoutingLabErrorTaxonomyBreakdown {
  /** Every attempt's code across the whole run, not just the final one. */
  readonly counts: Readonly<Partial<Record<RouterErrorCode, number>>>;
  readonly totalAttempts: number;
  readonly totalFailedAttempts: number;
  /** How many of the 15 canonical codes appeared at least once. */
  readonly distinctCodesObserved: number;
}

export interface RoutingLabManifestData {
  readonly totalCases: number;
  readonly generatedAt: string;
  readonly categoryCounts: Readonly<Partial<Record<RoutingLabCaseCategory, number>>>;
  readonly passDecline: RoutingLabPassDeclineBreakdown;
  readonly fallbackDepth: RoutingLabFallbackDepthBreakdown;
  readonly errorTaxonomy: RoutingLabErrorTaxonomyBreakdown;
}

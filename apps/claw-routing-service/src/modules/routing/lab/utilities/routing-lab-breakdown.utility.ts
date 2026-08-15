import type { RouterErrorCode, RoutingLabCaseCategory } from '../../../../common/enums';
import type {
  RoutingLabErrorTaxonomyBreakdown,
  RoutingLabFallbackDepthBreakdown,
  RoutingLabManifestData,
  RoutingLabPassDeclineBreakdown,
} from '../types/routing-lab-manifest.types';
import type { RoutingLabCaseOutcome, RoutingLabRunResult } from '../types/routing-lab-run.types';

/** Tallies via a `Map` rather than bracket-indexing a plain object with a
 * dynamic key, then converts to the plain record the manifest types expect. */
function tally<K extends string | number>(entries: Iterable<K>): Map<K, number> {
  const counts = new Map<K, number>();
  for (const key of entries) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function computeCategoryCounts(
  outcomes: readonly RoutingLabCaseOutcome[],
): Readonly<Partial<Record<RoutingLabCaseCategory, number>>> {
  const counts = tally(outcomes.map((outcome) => outcome.category));
  return Object.fromEntries(counts);
}

function computePassDecline(
  outcomes: readonly RoutingLabCaseOutcome[],
): RoutingLabPassDeclineBreakdown {
  const reasons: string[] = [];
  const finalCodes: RouterErrorCode[] = [];
  let passed = 0;
  let declinedUnavailable = 0;
  let declinedChainExhausted = 0;

  for (const outcome of outcomes) {
    if (outcome.passed) {
      passed += 1;
      continue;
    }
    if (!outcome.available) {
      declinedUnavailable += 1;
      reasons.push(outcome.unavailableReason ?? 'UNKNOWN');
      continue;
    }
    declinedChainExhausted += 1;
    if (outcome.finalErrorCode) {
      finalCodes.push(outcome.finalErrorCode);
    }
  }

  return {
    passed,
    declinedUnavailable,
    declinedChainExhausted,
    declinedByReason: Object.fromEntries(tally(reasons)),
    declinedByFinalErrorCode: Object.fromEntries(tally(finalCodes)),
  };
}

function computeFallbackDepth(
  outcomes: readonly RoutingLabCaseOutcome[],
): RoutingLabFallbackDepthBreakdown {
  const depths = outcomes
    .map((outcome) => outcome.fallbackDepth)
    .filter((depth): depth is number => depth !== null);

  const sum = depths.reduce((total, depth) => total + depth, 0);
  const maxDepth = depths.reduce((max, depth) => Math.max(max, depth), 0);

  return {
    histogram: Object.fromEntries(tally(depths)),
    averageDepth: depths.length === 0 ? 0 : sum / depths.length,
    maxDepth,
    successCount: depths.length,
  };
}

function computeErrorTaxonomy(
  outcomes: readonly RoutingLabCaseOutcome[],
): RoutingLabErrorTaxonomyBreakdown {
  const codes = outcomes.flatMap((outcome) =>
    outcome.attemptCodes.filter((code): code is RouterErrorCode => code !== null),
  );
  const totalAttempts = outcomes.reduce((total, outcome) => total + outcome.attemptCount, 0);
  const counts = tally(codes);

  return {
    counts: Object.fromEntries(counts),
    totalAttempts,
    totalFailedAttempts: codes.length,
    distinctCodesObserved: counts.size,
  };
}

/**
 * Pure aggregation from a completed `RoutingLabRunResult` into the shape the
 * manifest renderer consumes — kept separate from rendering so the numbers
 * themselves are unit-testable without parsing markdown back out.
 */
export function computeRoutingLabManifestData(
  runResult: RoutingLabRunResult,
): RoutingLabManifestData {
  return {
    totalCases: runResult.totalCases,
    generatedAt: runResult.generatedAt,
    categoryCounts: computeCategoryCounts(runResult.outcomes),
    passDecline: computePassDecline(runResult.outcomes),
    fallbackDepth: computeFallbackDepth(runResult.outcomes),
    errorTaxonomy: computeErrorTaxonomy(runResult.outcomes),
  };
}

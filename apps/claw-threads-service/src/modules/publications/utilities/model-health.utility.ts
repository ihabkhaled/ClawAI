import {
  RECOMMENDED_HEALTH_MIN_SAMPLES,
  RECOMMENDED_HEALTH_MIN_SUCCESS_RATE,
  RECOMMENDED_HEALTH_UNKNOWN_RATE,
} from '../constants/recommended-team.constants';
import type { ModelRef } from '../types/generation-preflight.types';
import type { ModelHealthIndex, ModelRecentHealth } from '../types/recommended-team.types';

export function modelHealthKey({ provider, model }: ModelRef): string {
  return `${provider.toUpperCase()}/${model.replace(/^models\//u, '')}`;
}

function summarise(ok: number, failed: number): ModelRecentHealth | null {
  const samples = ok + failed;
  return samples >= RECOMMENDED_HEALTH_MIN_SAMPLES ? { successRate: ok / samples, samples } : null;
}

/**
 * How the model has been doing in the last hour: its own calls when there are enough of them,
 * otherwise its provider's calls together (a provider-wide outage, such as an exhausted credit,
 * hits models that have not been tried yet). Null when there is not enough data to say.
 */
export function recentHealthOf(index: ModelHealthIndex, ref: ModelRef): ModelRecentHealth | null {
  const own = index.get(modelHealthKey(ref));
  const ownSummary = own ? summarise(own.ok, own.failed) : null;
  if (ownSummary) return ownSummary;
  const prefix = `${ref.provider.toUpperCase()}/`;
  let ok = 0;
  let failed = 0;
  for (const [key, counts] of index) {
    if (!key.startsWith(prefix)) continue;
    ok += counts.ok;
    failed += counts.failed;
  }
  return summarise(ok, failed);
}

export function isDegraded(index: ModelHealthIndex, ref: ModelRef): boolean {
  const health = recentHealthOf(index, ref);
  return health !== null && health.successRate < RECOMMENDED_HEALTH_MIN_SUCCESS_RATE;
}

/** Ranking score in tenths (0 to 10): healthier first; an unknown model counts as fairly healthy. */
export function healthRank(index: ModelHealthIndex, ref: ModelRef): number {
  const rate = recentHealthOf(index, ref)?.successRate ?? RECOMMENDED_HEALTH_UNKNOWN_RATE;
  return Math.round(rate * 10);
}

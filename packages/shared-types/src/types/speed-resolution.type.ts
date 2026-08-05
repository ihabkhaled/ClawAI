import type { ClawSpeedProfile, SpeedProviderMode } from '../enums/claw-speed-profile.enum';

/** Concrete request parameter for a provider fast/priority tier, if one exists. */
export type SpeedProviderParameter = {
  path: string;
  value: string;
};

/** Measured reality, filled in after the run. Never predicted up front. */
export type ObservedSpeed = {
  timeToFirstTokenMs: number;
  outputTokensPerSecond: number;
  wallTimeMs: number;
};

export type ResolvedSpeed = {
  requested: ClawSpeedProfile;
  providerMode: SpeedProviderMode;
  providerParameter?: SpeedProviderParameter;
  /**
   * The resource envelope actually granted — NOT the one requested.
   *
   * When the tier is unavailable this stays at 1. Reporting 2 here while
   * running on standard service is precisely the false claim §11.3 forbids,
   * and it would also over-reserve cost against a run that never got the
   * throughput it paid for.
   */
  resourceMultiplier: 1 | 1.5 | 2;
  /**
   * Concurrency ceilings. Read-only work parallelises; mutating operations
   * with overlapping roots stay serialized regardless of tier, because going
   * faster must never change correctness.
   */
  maxParallelReadOnlyTools: number;
  maxParallelSubAgents: number;
  /** True when a faster model route was substituted under AUTO policy. */
  modelRouteChanged: boolean;
  speculativeDecoding: boolean;
  observed?: ObservedSpeed;
  /** Set whenever the granted tier differs from the requested one. */
  warning?: string;
};

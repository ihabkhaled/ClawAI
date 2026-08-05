import { ClawSpeedProfile, type ResolvedSpeed, SpeedProviderMode } from '@claw/shared-types';
import {
  SPEED_MODE_BY_VALUE,
  SPEED_PARALLEL_READ_ONLY_TOOLS,
  SPEED_PARALLEL_SUB_AGENTS,
  SPEED_PREFERRED_VALUES,
  SPEED_RESOURCE_MULTIPLIER,
} from './speed-profile.constants';

/**
 * Resolves a requested speed tier against what a specific model actually
 * offers.
 *
 * The governing rule is §11.3: **fail or visibly degrade when the requested
 * tier is unavailable — never claim 2× while running standard.** So an
 * unavailable tier does not quietly become standard-with-a-2×-label. It
 * returns `providerMode: UNSUPPORTED`, keeps `resourceMultiplier` at 1, and
 * carries a warning.
 *
 * Keeping the multiplier honest matters twice over: it is the number shown to
 * the user, and it is the number a cost reservation is sized from. Reserving
 * 2× for a run that got standard throughput overcharges for speed nobody
 * received.
 *
 * `supportedValues` comes from the capability evidence registry — the exact
 * tier values this model/account was observed to accept.
 */
export function resolveSpeed(
  requested: ClawSpeedProfile,
  supportedValues: readonly string[],
  parameterPath?: string,
): ResolvedSpeed {
  // Standard asks nothing of the provider, so it is always honoured and never
  // needs a parameter.
  if (requested === ClawSpeedProfile.STANDARD_1X) {
    return baseline(requested, SpeedProviderMode.STANDARD);
  }

  const preferred = SPEED_PREFERRED_VALUES[requested];
  const granted =
    parameterPath === undefined
      ? undefined
      : preferred.find((value) => supportedValues.includes(value));

  if (granted === undefined) {
    // Degrade VISIBLY. The concurrency ceilings also drop back to standard:
    // parallelising harder on a lane that refused the tier does not recover
    // the throughput and does spend more of the user's rate limit.
    return {
      ...baseline(requested, SpeedProviderMode.UNSUPPORTED),
      warning: `Requested ${requested} is not available for this model; running at standard service. Resource multiplier stays 1× rather than claiming a tier that was not granted.`,
    };
  }

  return {
    requested,
    providerMode: SPEED_MODE_BY_VALUE[granted] ?? SpeedProviderMode.FAST,
    providerParameter: { path: parameterPath as string, value: granted },
    resourceMultiplier: SPEED_RESOURCE_MULTIPLIER[requested],
    maxParallelReadOnlyTools: SPEED_PARALLEL_READ_ONLY_TOOLS[requested],
    maxParallelSubAgents: SPEED_PARALLEL_SUB_AGENTS[requested],
    modelRouteChanged: false,
    speculativeDecoding: false,
  };
}

/**
 * Records what actually happened. Kept separate from resolution because a
 * measured number and a requested tier are different claims, and §11.5
 * requires the observed figures to be tracked rather than inferred from the
 * profile name.
 */
export function withObservedSpeed(
  resolved: ResolvedSpeed,
  // Optional because "nothing was measured" is a real outcome — a cancelled or
  // failed run has no throughput figures — not a missing argument.
  observed?: ResolvedSpeed['observed'],
): ResolvedSpeed {
  if (observed === undefined) {
    return resolved;
  }
  return { ...resolved, observed };
}

function baseline(requested: ClawSpeedProfile, providerMode: SpeedProviderMode): ResolvedSpeed {
  return {
    requested,
    providerMode,
    resourceMultiplier: 1,
    maxParallelReadOnlyTools: SPEED_PARALLEL_READ_ONLY_TOOLS[ClawSpeedProfile.STANDARD_1X],
    maxParallelSubAgents: SPEED_PARALLEL_SUB_AGENTS[ClawSpeedProfile.STANDARD_1X],
    modelRouteChanged: false,
    speculativeDecoding: false,
  };
}

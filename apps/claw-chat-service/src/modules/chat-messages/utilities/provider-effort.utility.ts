// Bridges ExecutionOptions onto the shared effort resolver.
//
// The shared resolver decides WHAT the effort should be; the request builders
// decide WHERE it goes, using their own typed fields. Keeping those apart
// means a new provider lane is a constants entry rather than another private
// copy of the mapping rules — which is how four lanes end up disagreeing about
// what MAX means.
//
// Deliberately returns typed values rather than writing into a request body by
// dotted path: a generic path-writer would need an untyped record, and this
// repository bans the assertions that requires. Each builder assigns its own
// declared field instead, so a wrong path is a compile error rather than a
// silently ignored request parameter.
//
// Pure: no I/O, no logger, no vendor SDK.

import {
  ClawEffortProfile,
  EffortResolutionKind,
  type ObservedSpeed,
  type ResolvedEffort,
  type ResolvedSpeed,
  SpeedProviderMode,
} from '@claw/shared-types';
import { resolveBooleanEffort, resolveEffort, resolveSpeed } from '@claw/shared-utilities';
import { ProviderToolDialect } from '../../../common/enums';
import type { ExecutionOptions } from '../types/execution-options.types';
import { EFFORT_PATH_BY_DIALECT, OLLAMA_THINK_FIELD } from '../constants/provider-tool.constants';

// Returns undefined when the caller asked for no effort at all, which leaves
// every existing request byte-identical to before this feature existed.
export function resolveExecutionEffort(
  executionOptions: ExecutionOptions | undefined,
  dialect: ProviderToolDialect,
): ResolvedEffort | undefined {
  const requested = executionOptions?.effortProfile;
  if (requested === undefined) {
    return undefined;
  }
  const supported = executionOptions?.effortSupportedValues ?? [];

  // Native Ollama commonly exposes reasoning as a boolean `think` rather than
  // a level. Routing it through the boolean resolver keeps the "no silent
  // mapping" guarantee: it reports that intermediate levels are not
  // distinguishable on this lane instead of pretending they are.
  if (dialect === ProviderToolDialect.OLLAMA && supported.length === 0) {
    return resolveBooleanEffort(requested, OLLAMA_THINK_FIELD);
  }

  return resolveEffort(requested, supported, EFFORT_PATH_BY_DIALECT[dialect]);
}

/**
 * The string level to put on a request, or undefined when this resolution
 * produced no provider parameter.
 *
 * ORCHESTRATED and UNSUPPORTED both mean "ClawAI supplies this, the provider
 * is not asked" — inventing a field there is exactly the silent mapping §10
 * forbids, so both return undefined.
 */
export function effortLevelForRequest(resolved: ResolvedEffort | undefined): string | undefined {
  const parameter = resolved?.providerParameter;
  if (parameter === undefined || resolved === undefined) {
    return undefined;
  }
  if (resolved.resolutionKind !== EffortResolutionKind.NATIVE) {
    return undefined;
  }
  return typeof parameter.value === 'string' ? parameter.value : undefined;
}

/** The boolean for on/off reasoning lanes, or undefined when not applicable. */
export function effortFlagForRequest(resolved: ResolvedEffort | undefined): boolean | undefined {
  const parameter = resolved?.providerParameter;
  if (parameter === undefined || resolved === undefined) {
    return undefined;
  }
  if (resolved.resolutionKind !== EffortResolutionKind.BOOLEAN) {
    return undefined;
  }
  return typeof parameter.value === 'boolean' ? parameter.value : undefined;
}

// True when the model could not honour what was asked. Callers surface this so
// a downgrade reaches the user instead of looking like a model that simply
// reasoned less.
export function isEffortDowngraded(resolved: ResolvedEffort | undefined): boolean {
  if (resolved === undefined) return false;
  if (resolved.requested === ClawEffortProfile.AUTO) return false;
  return resolved.resolvedProfile !== resolved.requested;
}

// ── Speed ───────────────────────────────────────────────────────────────────

/**
 * Resolves the requested speed tier for a lane.
 *
 * Returns undefined when no tier was requested, which leaves the request
 * exactly as it was before this feature existed. Lanes with no tier mechanism
 * pass no path, and the resolver reports UNSUPPORTED rather than pretending
 * standard service satisfied the request.
 */
export function resolveExecutionSpeed(
  executionOptions: ExecutionOptions | undefined,
  parameterPath: string | undefined,
): ResolvedSpeed | undefined {
  const requested = executionOptions?.speedProfile;
  if (requested === undefined) {
    return undefined;
  }
  return resolveSpeed(requested, executionOptions?.speedSupportedValues ?? [], parameterPath);
}

/** The tier value to put on a request, or undefined when none was granted. */
export function speedTierForRequest(resolved: ResolvedSpeed | undefined): string | undefined {
  return resolved?.providerParameter?.value;
}

/** True when the requested tier could not be granted. */
export function isSpeedUnavailable(resolved: ResolvedSpeed | undefined): boolean {
  return resolved?.providerMode === SpeedProviderMode.UNSUPPORTED;
}

/**
 * Builds an ObservedSpeed from MEASURED stream metrics.
 *
 * Returns undefined unless both figures were actually measured. §11.5 requires
 * throughput to be tracked rather than inferred, so a missing measurement is
 * reported as missing — filling it with a zero, or with a number derived from
 * the requested tier, would turn "we did not measure" into a false claim that
 * we did.
 */
export function buildObservedSpeed(
  timeToFirstTokenMs: number | undefined,
  tokensPerSecond: number | undefined,
  wallTimeMs: number,
): ObservedSpeed | undefined {
  if (timeToFirstTokenMs === undefined || tokensPerSecond === undefined) {
    return undefined;
  }
  return { timeToFirstTokenMs, outputTokensPerSecond: tokensPerSecond, wallTimeMs };
}

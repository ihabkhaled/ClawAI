import { ClawEffortProfile, EffortResolutionKind, type ResolvedEffort } from '@claw/shared-types';
import {
  EFFORT_AUTO_DEFAULT,
  EFFORT_BUDGET,
  EFFORT_NATIVE_VALUE,
  EFFORT_ORCHESTRATION,
  EFFORT_PROFILE_LADDER,
} from './effort-profile.constants';

/**
 * Resolves a requested effort profile against what a specific model actually
 * accepts.
 *
 * The governing rule is §10: **never silently map an unsupported profile**.
 * Asking for MAX and quietly receiving `low` is indistinguishable, from the
 * outside, from a model that simply reasoned less — the user pays for the
 * former believing they got the latter. So every downgrade is reported in
 * `resolvedProfile` + `warning`, and a caller that cannot tolerate one can
 * reject on `resolvedProfile !== requested`.
 *
 * `supportedValues` comes from the capability evidence registry — the exact
 * values this model/digest was observed to accept — never from a name guess.
 * An empty list means nothing is proven, which resolves to ORCHESTRATED (we
 * supply the effort ourselves) rather than to an invented parameter.
 */
export function resolveEffort(
  requested: ClawEffortProfile,
  supportedValues: readonly string[],
  // Optional because "this lane exposes no effort parameter" is a real and
  // common case, not a missing argument — llama.cpp-style budgets and
  // orchestration-only providers both land here.
  parameterPath?: string,
): ResolvedEffort {
  const target = requested === ClawEffortProfile.AUTO ? EFFORT_AUTO_DEFAULT : requested;

  // No proven values and no path to put them on: ClawAI supplies the effort
  // through its own planning/verification passes. This is honest — the
  // orchestration really does happen — and it never invents a provider value.
  if (parameterPath === undefined || supportedValues.length === 0) {
    return buildResult(requested, target, EffortResolutionKind.ORCHESTRATED, false, undefined, {
      warningWhenDowngraded: false,
    });
  }

  // ULTRA is a ClawAI preset. No provider documents an `ultra` level, so it
  // always resolves to the highest PROVEN native level plus extra passes —
  // sending the literal string would be inventing a parameter value.
  const effectiveTarget =
    target === ClawEffortProfile.ULTRA ? highestSupported(supportedValues) : target;
  if (effectiveTarget === undefined) {
    return buildResult(requested, target, EffortResolutionKind.ORCHESTRATED, false, undefined, {
      warningWhenDowngraded: false,
    });
  }

  const exact = EFFORT_NATIVE_VALUE[effectiveTarget];
  if (exact !== undefined && supportedValues.includes(exact)) {
    const atCeiling = isProviderCeiling(exact, supportedValues);
    return buildResult(
      requested,
      // ULTRA keeps its identity: the native value is the ceiling, but the
      // extra orchestration passes are what make it ULTRA.
      target === ClawEffortProfile.ULTRA ? ClawEffortProfile.ULTRA : effectiveTarget,
      EffortResolutionKind.NATIVE,
      atCeiling,
      { path: parameterPath, value: exact },
      { warningWhenDowngraded: true },
    );
  }

  // The exact level is not accepted. Walk DOWN, never up: silently giving more
  // reasoning than asked for spends the user's money without consent.
  const fallback = highestSupportedAtOrBelow(effectiveTarget, supportedValues);
  if (fallback === undefined) {
    return buildResult(requested, target, EffortResolutionKind.ORCHESTRATED, false, undefined, {
      warningWhenDowngraded: false,
    });
  }

  const fallbackValue = EFFORT_NATIVE_VALUE[fallback];
  return buildResult(
    requested,
    fallback,
    EffortResolutionKind.NATIVE,
    isProviderCeiling(fallbackValue ?? '', supportedValues),
    fallbackValue === undefined ? undefined : { path: parameterPath, value: fallbackValue },
    { warningWhenDowngraded: true },
  );
}

/**
 * Boolean-only lanes (some Ollama models expose `think` as a flag rather than
 * a level). MINIMAL and LOW map to off; everything else maps to on. There is
 * no way to express "a bit more thinking" here, and pretending otherwise would
 * be the silent mapping §10 forbids — so the coarseness is reported.
 */
export function resolveBooleanEffort(
  requested: ClawEffortProfile,
  parameterPath: string,
): ResolvedEffort {
  const target = requested === ClawEffortProfile.AUTO ? EFFORT_AUTO_DEFAULT : requested;
  const thinkingOff = target === ClawEffortProfile.MINIMAL || target === ClawEffortProfile.LOW;
  const result = buildResult(
    requested,
    target,
    EffortResolutionKind.BOOLEAN,
    !thinkingOff,
    { path: parameterPath, value: !thinkingOff },
    { warningWhenDowngraded: false },
  );
  return {
    ...result,
    warning: `Model exposes reasoning as an on/off flag, so ${target} resolved to think=${String(!thinkingOff)}. Intermediate levels are not distinguishable on this lane.`,
  };
}

/** Highest profile whose native value the model accepts. */
function highestSupported(supportedValues: readonly string[]): ClawEffortProfile | undefined {
  for (let index = EFFORT_PROFILE_LADDER.length - 1; index >= 0; index--) {
    const profile = EFFORT_PROFILE_LADDER[index];
    if (profile === undefined) continue;
    const value = EFFORT_NATIVE_VALUE[profile];
    if (value !== undefined && supportedValues.includes(value)) {
      return profile;
    }
  }
  return undefined;
}

function highestSupportedAtOrBelow(
  target: ClawEffortProfile,
  supportedValues: readonly string[],
): ClawEffortProfile | undefined {
  const ceiling = EFFORT_PROFILE_LADDER.indexOf(target);
  if (ceiling < 0) return undefined;
  for (let index = ceiling; index >= 0; index--) {
    const profile = EFFORT_PROFILE_LADDER[index];
    if (profile === undefined) continue;
    const value = EFFORT_NATIVE_VALUE[profile];
    if (value !== undefined && supportedValues.includes(value)) {
      return profile;
    }
  }
  return undefined;
}

/** True when no accepted value sits above this one on the ladder. */
function isProviderCeiling(value: string, supportedValues: readonly string[]): boolean {
  const highest = highestSupported(supportedValues);
  if (highest === undefined) return false;
  return EFFORT_NATIVE_VALUE[highest] === value;
}

function buildResult(
  requested: ClawEffortProfile,
  resolvedProfile: ClawEffortProfile,
  resolutionKind: EffortResolutionKind,
  providerMaximumReached: boolean,
  providerParameter: ResolvedEffort['providerParameter'],
  options: { warningWhenDowngraded: boolean },
): ResolvedEffort {
  const requestedTarget = requested === ClawEffortProfile.AUTO ? EFFORT_AUTO_DEFAULT : requested;
  const downgraded =
    EFFORT_PROFILE_LADDER.indexOf(resolvedProfile) < EFFORT_PROFILE_LADDER.indexOf(requestedTarget);

  const orchestration = EFFORT_ORCHESTRATION[resolvedProfile];
  const budget = EFFORT_BUDGET[resolvedProfile];

  const result: ResolvedEffort = {
    requested,
    resolvedProfile,
    resolutionKind,
    providerMaximumReached,
    orchestration,
    budget,
    ...(providerParameter === undefined ? {} : { providerParameter }),
  };

  if (resolutionKind === EffortResolutionKind.ORCHESTRATED) {
    return {
      ...result,
      warning: `No proven provider effort control for this model; ${requestedTarget} is supplied by ClawAI orchestration (${String(orchestration.planningPasses)} planning / ${String(orchestration.verificationPasses)} verification passes) rather than a provider parameter.`,
    };
  }
  if (downgraded && options.warningWhenDowngraded) {
    return {
      ...result,
      warning: `Requested ${requestedTarget} is not accepted by this model; resolved down to ${resolvedProfile}, the highest proven level at or below it.`,
    };
  }
  return result;
}

import { ClawSpeedProfile, SpeedProviderMode } from '@claw/shared-types';

/**
 * Concurrency ceilings per profile (§11.3).
 *
 * Only READ-ONLY work scales. Mutating operations with overlapping roots stay
 * serialized at every tier — going faster must never change correctness, and
 * "never parallelize conflicting writes merely to appear faster" is an
 * explicit rule, not an implementation detail.
 */
export const SPEED_PARALLEL_READ_ONLY_TOOLS: Readonly<Record<ClawSpeedProfile, number>> = {
  [ClawSpeedProfile.STANDARD_1X]: 2,
  [ClawSpeedProfile.ACCELERATED_1_5X]: 4,
  [ClawSpeedProfile.TURBO_2X]: 8,
};

export const SPEED_PARALLEL_SUB_AGENTS: Readonly<Record<ClawSpeedProfile, number>> = {
  [ClawSpeedProfile.STANDARD_1X]: 1,
  [ClawSpeedProfile.ACCELERATED_1_5X]: 2,
  [ClawSpeedProfile.TURBO_2X]: 4,
};

/** Resource envelope a profile may claim ONCE the tier is actually granted. */
export const SPEED_RESOURCE_MULTIPLIER: Readonly<Record<ClawSpeedProfile, 1 | 1.5 | 2>> = {
  [ClawSpeedProfile.STANDARD_1X]: 1,
  [ClawSpeedProfile.ACCELERATED_1_5X]: 1.5,
  [ClawSpeedProfile.TURBO_2X]: 2,
};

/**
 * Provider tier values, keyed by the value a lane must accept for the profile
 * to be honoured. Membership is proven from the capability evidence registry —
 * never assumed from a provider name.
 */
export const SPEED_VALUE_FAST = 'fast';
export const SPEED_VALUE_PRIORITY = 'priority';
export const SPEED_VALUE_FLEX = 'flex';

/** OpenAI expresses tiering as a service_tier on the request. */
export const SPEED_PATH_OPENAI_SERVICE_TIER = 'service_tier';

/** Anthropic exposes a speed field on supported models/accounts. */
export const SPEED_PATH_ANTHROPIC_SPEED = 'speed';

/** Which provider mode a granted value corresponds to. */
export const SPEED_MODE_BY_VALUE: Readonly<Record<string, SpeedProviderMode>> = {
  [SPEED_VALUE_FAST]: SpeedProviderMode.FAST,
  [SPEED_VALUE_PRIORITY]: SpeedProviderMode.PRIORITY,
  [SPEED_VALUE_FLEX]: SpeedProviderMode.STANDARD,
};

/**
 * Preference order per profile. The first value the model is PROVEN to accept
 * wins; if none are proven the tier is unavailable and must be reported as
 * such rather than silently served as standard.
 */
export const SPEED_PREFERRED_VALUES: Readonly<Record<ClawSpeedProfile, readonly string[]>> = {
  [ClawSpeedProfile.STANDARD_1X]: [],
  [ClawSpeedProfile.ACCELERATED_1_5X]: [SPEED_VALUE_FAST, SPEED_VALUE_PRIORITY],
  [ClawSpeedProfile.TURBO_2X]: [SPEED_VALUE_PRIORITY, SPEED_VALUE_FAST],
};

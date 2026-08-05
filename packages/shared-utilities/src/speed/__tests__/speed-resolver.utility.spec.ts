import { ClawSpeedProfile, SpeedProviderMode } from '@claw/shared-types';
import {
  SPEED_PATH_OPENAI_SERVICE_TIER,
  SPEED_VALUE_FAST,
  SPEED_VALUE_PRIORITY,
} from '../speed-profile.constants';
import { resolveSpeed, withObservedSpeed } from '../speed-resolver.utility';

// The governing rule (§11.3): fail or visibly degrade when the requested tier
// is unavailable — never claim 2× while running standard. The multiplier is
// both what the user is shown AND what a cost reservation is sized from, so an
// inflated one overcharges for throughput nobody received.

const TIERED = [SPEED_VALUE_FAST, SPEED_VALUE_PRIORITY];

describe('resolveSpeed — standard', () => {
  it('is always honoured and asks nothing of the provider', () => {
    const result = resolveSpeed(ClawSpeedProfile.STANDARD_1X, [], SPEED_PATH_OPENAI_SERVICE_TIER);

    expect(result.providerMode).toBe(SpeedProviderMode.STANDARD);
    expect(result.providerParameter).toBeUndefined();
    expect(result.resourceMultiplier).toBe(1);
    expect(result.warning).toBeUndefined();
  });
});

describe('resolveSpeed — tier granted', () => {
  it('sets the provider parameter and claims the multiplier', () => {
    const result = resolveSpeed(
      ClawSpeedProfile.ACCELERATED_1_5X,
      TIERED,
      SPEED_PATH_OPENAI_SERVICE_TIER,
    );

    expect(result.providerParameter).toEqual({
      path: SPEED_PATH_OPENAI_SERVICE_TIER,
      value: SPEED_VALUE_FAST,
    });
    expect(result.resourceMultiplier).toBe(1.5);
    expect(result.providerMode).toBe(SpeedProviderMode.FAST);
    expect(result.warning).toBeUndefined();
  });

  it('prefers priority for TURBO and reports the 2x envelope', () => {
    const result = resolveSpeed(ClawSpeedProfile.TURBO_2X, TIERED, SPEED_PATH_OPENAI_SERVICE_TIER);

    expect(result.providerParameter?.value).toBe(SPEED_VALUE_PRIORITY);
    expect(result.resourceMultiplier).toBe(2);
    expect(result.providerMode).toBe(SpeedProviderMode.PRIORITY);
  });

  it('raises read-only concurrency with the tier', () => {
    const standard = resolveSpeed(ClawSpeedProfile.STANDARD_1X, TIERED, 'service_tier');
    const turbo = resolveSpeed(ClawSpeedProfile.TURBO_2X, TIERED, 'service_tier');

    expect(turbo.maxParallelReadOnlyTools).toBeGreaterThan(standard.maxParallelReadOnlyTools);
    expect(turbo.maxParallelSubAgents).toBeGreaterThan(standard.maxParallelSubAgents);
  });
});

describe('resolveSpeed — tier unavailable', () => {
  it('NEVER claims a multiplier it did not get', () => {
    // The entire point. Reporting 2 here while running standard is the false
    // claim §11.3 forbids, and it would over-reserve cost as well.
    const result = resolveSpeed(ClawSpeedProfile.TURBO_2X, [], SPEED_PATH_OPENAI_SERVICE_TIER);

    expect(result.resourceMultiplier).toBe(1);
    expect(result.providerMode).toBe(SpeedProviderMode.UNSUPPORTED);
    expect(result.providerParameter).toBeUndefined();
    expect(result.warning).toMatch(/not available for this model/u);
    expect(result.warning).toMatch(/stays 1×/u);
  });

  it('reports UNSUPPORTED rather than silently reporting STANDARD', () => {
    // "We asked for turbo and did not get it" must be distinguishable from
    // "we are running standard" — otherwise the degradation is invisible.
    const degraded = resolveSpeed(ClawSpeedProfile.TURBO_2X, [], 'service_tier');
    const standard = resolveSpeed(ClawSpeedProfile.STANDARD_1X, [], 'service_tier');

    expect(degraded.providerMode).not.toBe(standard.providerMode);
  });

  it('drops concurrency back to standard when the tier was refused', () => {
    // Parallelising harder on a lane that refused the tier does not recover
    // the throughput and does spend more of the user's rate limit.
    const result = resolveSpeed(ClawSpeedProfile.TURBO_2X, [], 'service_tier');
    const standard = resolveSpeed(ClawSpeedProfile.STANDARD_1X, [], 'service_tier');

    expect(result.maxParallelReadOnlyTools).toBe(standard.maxParallelReadOnlyTools);
    expect(result.maxParallelSubAgents).toBe(standard.maxParallelSubAgents);
  });

  it('is unsupported when the lane has no speed parameter at all', () => {
    const result = resolveSpeed(ClawSpeedProfile.ACCELERATED_1_5X, TIERED);

    expect(result.providerMode).toBe(SpeedProviderMode.UNSUPPORTED);
    expect(result.resourceMultiplier).toBe(1);
  });

  it('falls back when only an unrelated tier value is supported', () => {
    const result = resolveSpeed(ClawSpeedProfile.TURBO_2X, ['economy'], 'service_tier');

    expect(result.providerMode).toBe(SpeedProviderMode.UNSUPPORTED);
  });
});

describe('speed is orthogonal to effort', () => {
  it('never reports a model route change or speculative decoding by default', () => {
    // Speed must not silently trade quality. Swapping to a faster model is a
    // separate, explicitly-flagged decision under AUTO policy.
    const result = resolveSpeed(ClawSpeedProfile.TURBO_2X, TIERED, 'service_tier');

    expect(result.modelRouteChanged).toBe(false);
    expect(result.speculativeDecoding).toBe(false);
  });
});

describe('withObservedSpeed', () => {
  it('attaches measured figures without altering the resolution', () => {
    const resolved = resolveSpeed(ClawSpeedProfile.TURBO_2X, TIERED, 'service_tier');
    const observed = withObservedSpeed(resolved, {
      timeToFirstTokenMs: 120,
      outputTokensPerSecond: 88,
      wallTimeMs: 4200,
    });

    expect(observed.observed?.outputTokensPerSecond).toBe(88);
    expect(observed.providerMode).toBe(resolved.providerMode);
    expect(observed.resourceMultiplier).toBe(resolved.resourceMultiplier);
  });

  it('is a no-op when nothing was measured', () => {
    const resolved = resolveSpeed(ClawSpeedProfile.STANDARD_1X, [], 'service_tier');

    expect(withObservedSpeed(resolved)).toEqual(resolved);
  });
});

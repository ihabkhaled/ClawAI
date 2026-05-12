import { RoutingMode } from '../../../generated/prisma';
import { DEFAULT_POLICY_WEIGHTS } from '../constants/scoring.constants';
import { resolvePolicyWeights } from '../utilities/policy-weights-resolver.utility';

describe('resolvePolicyWeights', () => {
  it('returns the per-mode default when policyConfig is null', () => {
    const result = resolvePolicyWeights(RoutingMode.AUTO, null);
    expect(result).toEqual(DEFAULT_POLICY_WEIGHTS[RoutingMode.AUTO]);
  });

  it('returns the per-mode default when policyConfig is undefined', () => {
    const result = resolvePolicyWeights(RoutingMode.COST_SAVER);
    expect(result).toEqual(DEFAULT_POLICY_WEIGHTS[RoutingMode.COST_SAVER]);
  });

  it('returns the per-mode default when weightsJson is missing', () => {
    const result = resolvePolicyWeights(RoutingMode.LOW_LATENCY, {});
    expect(result).toEqual(DEFAULT_POLICY_WEIGHTS[RoutingMode.LOW_LATENCY]);
  });

  it('returns the per-mode default when weightsJson is not an object', () => {
    const result = resolvePolicyWeights(RoutingMode.AUTO, { weightsJson: 'invalid' });
    expect(result).toEqual(DEFAULT_POLICY_WEIGHTS[RoutingMode.AUTO]);
  });

  it('returns the per-mode default when weightsJson is missing a dimension', () => {
    const result = resolvePolicyWeights(RoutingMode.AUTO, {
      weightsJson: { capability: 0.5, domain: 0.5 },
    });
    expect(result).toEqual(DEFAULT_POLICY_WEIGHTS[RoutingMode.AUTO]);
  });

  it('returns the per-mode default when weightsJson does not sum to 1.0', () => {
    const valid: Record<string, number> = {};
    for (const k of Object.keys(DEFAULT_POLICY_WEIGHTS.AUTO)) valid[k] = 0.5;
    const result = resolvePolicyWeights(RoutingMode.AUTO, { weightsJson: valid });
    expect(result).toEqual(DEFAULT_POLICY_WEIGHTS[RoutingMode.AUTO]);
  });

  it('returns the custom weights when they sum to 1.0 ±tolerance', () => {
    const custom: Record<string, number> = {};
    const dims = Object.keys(DEFAULT_POLICY_WEIGHTS.AUTO);
    const v = 1 / dims.length;
    for (const k of dims) custom[k] = v;
    const result = resolvePolicyWeights(RoutingMode.AUTO, { weightsJson: custom });
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(Math.abs(total - 1)).toBeLessThanOrEqual(0.001);
    // Should match the custom vector, not the default
    expect(result.capability).toBeCloseTo(v, 5);
  });
});

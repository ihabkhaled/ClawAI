import { RoutingMode } from '../../../generated/prisma';
import { DEFAULT_POLICY_WEIGHTS, WEIGHTS_SUM_TOLERANCE } from '../constants/scoring.constants';
import { sumsToOne } from '../utilities/normalize.utility';

describe('DEFAULT_POLICY_WEIGHTS', () => {
  it.each(Object.values(RoutingMode))('mode=%s weights sum to ~1.0', (mode) => {
    const weights = DEFAULT_POLICY_WEIGHTS[mode];
    expect(weights).toBeDefined();
    expect(sumsToOne(Object.values(weights), WEIGHTS_SUM_TOLERANCE)).toBe(true);
  });

  it('AUTO is balanced (no dimension exceeds 0.25)', () => {
    const weights = DEFAULT_POLICY_WEIGHTS[RoutingMode.AUTO];
    for (const value of Object.values(weights)) {
      expect(value).toBeLessThanOrEqual(0.25);
    }
  });

  it('COST_SAVER places highest weight on cost', () => {
    const weights = DEFAULT_POLICY_WEIGHTS[RoutingMode.COST_SAVER];
    const cost = weights.cost;
    const others = Object.entries(weights)
      .filter(([k]) => k !== 'cost')
      .map(([, v]) => v);
    for (const v of others) expect(v).toBeLessThanOrEqual(cost);
  });

  it('LOW_LATENCY places highest weight on latency', () => {
    const weights = DEFAULT_POLICY_WEIGHTS[RoutingMode.LOW_LATENCY];
    const latency = weights.latency;
    const others = Object.entries(weights)
      .filter(([k]) => k !== 'latency')
      .map(([, v]) => v);
    for (const v of others) expect(v).toBeLessThanOrEqual(latency);
  });

  it('PRIVACY_FIRST places highest weight on privacy', () => {
    const weights = DEFAULT_POLICY_WEIGHTS[RoutingMode.PRIVACY_FIRST];
    const privacy = weights.privacy;
    const others = Object.entries(weights)
      .filter(([k]) => k !== 'privacy')
      .map(([, v]) => v);
    for (const v of others) expect(v).toBeLessThanOrEqual(privacy);
  });

  it('HIGH_REASONING places highest weight on capability', () => {
    const weights = DEFAULT_POLICY_WEIGHTS[RoutingMode.HIGH_REASONING];
    const capability = weights.capability;
    const others = Object.entries(weights)
      .filter(([k]) => k !== 'capability')
      .map(([, v]) => v);
    for (const v of others) expect(v).toBeLessThanOrEqual(capability);
  });
});

import { describe, expect, it } from 'vitest';
import { type PlanWithAccess } from '../../../plans/types/plans.types';
import {
  pickAllowedModelAccess,
  resolveFreeCreditCeiling,
} from '../entitlement-projection.utility';

function planWith(partial: Partial<PlanWithAccess>): PlanWithAccess {
  return partial as PlanWithAccess;
}

describe('pickAllowedModelAccess', () => {
  it('returns an empty list when there is no plan', () => {
    expect(pickAllowedModelAccess(null)).toEqual([]);
  });

  it('keeps only allowed rows', () => {
    const allowed = { provider: 'p', model: 'a', isAllowed: true };
    const denied = { provider: 'p', model: 'b', isAllowed: false };
    const plan = planWith({ modelAccess: [allowed, denied] as PlanWithAccess['modelAccess'] });
    expect(pickAllowedModelAccess(plan)).toEqual([allowed]);
  });
});

describe('resolveFreeCreditCeiling', () => {
  it('is null for an administrator', () => {
    const plan = planWith({ creditConnectorFreeMaxModelOutputMicroUsd: 5n });
    expect(resolveFreeCreditCeiling(true, plan)).toBeNull();
  });

  it('is null when the plan is missing or has no ceiling', () => {
    expect(resolveFreeCreditCeiling(false, null)).toBeNull();
    const plan = planWith({ creditConnectorFreeMaxModelOutputMicroUsd: null });
    expect(resolveFreeCreditCeiling(false, plan)).toBeNull();
  });

  it('converts the stored ceiling to a number', () => {
    const plan = planWith({ creditConnectorFreeMaxModelOutputMicroUsd: 7n });
    expect(resolveFreeCreditCeiling(false, plan)).toBe(7);
  });
});

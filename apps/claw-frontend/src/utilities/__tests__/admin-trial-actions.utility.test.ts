import { describe, expect, it } from 'vitest';

import type { PlanView } from '@/types/plan.types';
import {
  parseTrialActionDays,
  resolveFreeTrialPlan,
  resolveTrialActionErrorKey,
} from '@/utilities/admin-trial-actions.utility';

const plan = (overrides: Partial<PlanView>): PlanView => ({ id: 'p', ...overrides }) as PlanView;

describe('parseTrialActionDays', () => {
  it.each([
    ['1', 1],
    ['90', 90],
    [' 365 ', 365],
    ['3650', 3650],
  ])('accepts %s', (text, expected) => {
    expect(parseTrialActionDays(text)).toBe(expected);
  });

  it.each(['', '  ', '0', '-3', '3651', '1.5', 'ten'])('rejects "%s"', (text) => {
    expect(parseTrialActionDays(text)).toBeNull();
  });
});

describe('resolveTrialActionErrorKey', () => {
  it('flags the days first, then the reason, then passes', () => {
    expect(resolveTrialActionErrorKey('0', '')).toBe('admin.assignPlanDurationDaysInvalid');
    expect(resolveTrialActionErrorKey('30', '   ')).toBe('admin.assignPlanReasonRequired');
    expect(resolveTrialActionErrorKey('30', 'Support')).toBeNull();
  });
});

describe('resolveFreeTrialPlan', () => {
  it('prefers the active default trial plan', () => {
    const picked = resolveFreeTrialPlan([
      plan({ id: 'a', isTrial: true, isActive: true, isDefault: false }),
      plan({ id: 'b', isTrial: true, isActive: true, isDefault: true }),
      plan({ id: 'c', isTrial: false, isActive: true, isDefault: false }),
    ]);
    expect(picked?.id).toBe('b');
  });

  it('ignores inactive plans and returns null when there is no trial plan', () => {
    expect(resolveFreeTrialPlan([plan({ isTrial: true, isActive: false })])).toBeNull();
    expect(resolveFreeTrialPlan([])).toBeNull();
  });
});

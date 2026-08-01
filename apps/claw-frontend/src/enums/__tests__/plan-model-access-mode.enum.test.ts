import { describe, expect, it } from 'vitest';

import { PlanModelAccessMode } from '../plan-model-access-mode.enum';

describe('PlanModelAccessMode', () => {
  it('matches the plan API wire values', () => {
    expect(Object.values(PlanModelAccessMode)).toEqual([
      'ALLOW_ALL',
      'DENY_ALL',
      'ALLOW_LIST',
      'ALLOW_COST_CLASSES',
      'LEGACY_UNRESTRICTED',
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { resolvePlanSubmitLabelKey } from '@/utilities/plan-form.utility';

describe('resolvePlanSubmitLabelKey', () => {
  it('returns the submitting key while submitting (create)', () => {
    expect(resolvePlanSubmitLabelKey(true, false)).toBe('adminPlans.form.submitting');
  });

  it('returns the submitting key while submitting (edit)', () => {
    expect(resolvePlanSubmitLabelKey(true, true)).toBe('adminPlans.form.submitting');
  });

  it('returns the update key when editing and not submitting', () => {
    expect(resolvePlanSubmitLabelKey(false, true)).toBe('adminPlans.form.submitUpdate');
  });

  it('returns the create key when creating and not submitting', () => {
    expect(resolvePlanSubmitLabelKey(false, false)).toBe('adminPlans.form.submitCreate');
  });
});

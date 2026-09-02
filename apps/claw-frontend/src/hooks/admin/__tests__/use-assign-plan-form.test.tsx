import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAssignPlanForm } from '../use-assign-plan-form';

const user = { id: 'user-1', activePlanId: 'plan-free' } as never;

describe('useAssignPlanForm', () => {
  it('resets to the target plan when the dialog opens for a new user', () => {
    const onSave = vi.fn();
    const { result, rerender } = renderHook(
      ({ u, planId }) => useAssignPlanForm(u, planId, onSave),
      { initialProps: { u: null as typeof user | null, planId: null as string | null } },
    );
    expect(result.current.form.getValues('planId')).toBe('');

    rerender({ u: user, planId: 'plan-pro' });
    expect(result.current.form.getValues('planId')).toBe('plan-pro');
  });

  it('does not submit while duration or reason are invalid', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAssignPlanForm(user, 'plan-pro', onSave));
    await act(async () => {
      await result.current.submit();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits userId, planId, durationMonths and a trimmed grantReason', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAssignPlanForm(user, 'plan-pro', onSave));
    act(() => {
      result.current.form.setValue('durationMonths', 3, { shouldValidate: true });
      result.current.form.setValue('grantReason', '  Support gesture  ', { shouldValidate: true });
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(onSave).toHaveBeenCalledWith('user-1', 'plan-pro', 3, 'Support gesture');
  });
});

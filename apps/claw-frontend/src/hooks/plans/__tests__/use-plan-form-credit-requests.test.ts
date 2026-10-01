import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlanForm } from '@/hooks/plans/use-plan-form';

function fillBase(result: { current: ReturnType<typeof usePlanForm> }): void {
  act(() => {
    result.current.setField('name', 'Starter');
    result.current.setField('slug', 'starter');
  });
}

describe('usePlanForm credit-connector free requests', () => {
  it('starts a new plan at the server default of 2', () => {
    const { result } = renderHook(() => usePlanForm(null));
    expect(result.current.state.creditConnectorFreeRequestsPerMonth).toBe('2');
    fillBase(result);
    expect(result.current.buildCreateRequest()).toMatchObject({
      creditConnectorFreeRequestsPerMonth: 2,
    });
  });

  it('sends a blank value as null (unlimited) and keeps 0 as off', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('creditConnectorFreeRequestsPerMonth', '');
    });
    expect(result.current.buildCreateRequest()).toMatchObject({
      creditConnectorFreeRequestsPerMonth: null,
    });
    act(() => {
      result.current.setField('creditConnectorFreeRequestsPerMonth', '0');
    });
    expect(result.current.buildCreateRequest()).toMatchObject({
      creditConnectorFreeRequestsPerMonth: 0,
    });
  });

  it.each(['-1', '100001', '1.5', 'abc'])('rejects %s with a translation key', (value) => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('creditConnectorFreeRequestsPerMonth', value);
    });
    let request: unknown = 'unset';
    act(() => {
      request = result.current.buildCreateRequest();
    });
    expect(request).toBeNull();
    expect(result.current.fieldErrors.creditConnectorFreeRequestsPerMonth).toBe(
      'adminPlans.form.creditConnectorFreeRequestsInvalid',
    );
  });

  it('accepts the 100000 upper bound', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('creditConnectorFreeRequestsPerMonth', '100000');
    });
    expect(result.current.buildCreateRequest()).toMatchObject({
      creditConnectorFreeRequestsPerMonth: 100_000,
    });
  });
});

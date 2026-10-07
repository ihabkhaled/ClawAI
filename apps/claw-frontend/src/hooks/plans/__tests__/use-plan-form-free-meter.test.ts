import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlanForm } from '@/hooks/plans/use-plan-form';
import type { PlanView } from '@/types';

function fillBase(result: { current: ReturnType<typeof usePlanForm> }): void {
  act(() => {
    result.current.setField('name', 'Free');
    result.current.setField('slug', 'free');
  });
}

describe('usePlanForm free allowance meter and price limit (ADR-162)', () => {
  it('starts a new plan with no meter and no price limit', () => {
    const { result } = renderHook(() => usePlanForm(null));
    expect(result.current.state.creditConnectorFreeBudgetUsd).toBe('');
    expect(result.current.state.creditConnectorFreeMaxModelOutputUsd).toBe('');
    fillBase(result);
    expect(result.current.buildCreateRequest()).toMatchObject({
      creditConnectorFreeBudgetMicroUsd: null,
      creditConnectorFreeMaxModelOutputMicroUsd: null,
    });
  });

  it('turns typed dollars into exact integer micro-USD', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('creditConnectorFreeBudgetUsd', '0.25');
      result.current.setField('creditConnectorFreeMaxModelOutputUsd', '5');
    });
    expect(result.current.buildCreateRequest()).toMatchObject({
      creditConnectorFreeBudgetMicroUsd: 250_000,
      creditConnectorFreeMaxModelOutputMicroUsd: 5_000_000,
    });
  });

  it('loads an existing plan back into dollars', () => {
    const plan = {
      id: 'p',
      name: 'Free',
      slug: 'free',
      creditConnectorFreeBudgetMicroUsd: 250_000,
      creditConnectorFreeMaxModelOutputMicroUsd: 5_000_000,
    } as unknown as PlanView;
    const { result } = renderHook(() => usePlanForm(plan));
    expect(result.current.state.creditConnectorFreeBudgetUsd).toBe('0.25');
    expect(result.current.state.creditConnectorFreeMaxModelOutputUsd).toBe('5');
  });

  it.each(['-1', '0.1234567', 'abc', '1,5', '1000.01'])(
    'rejects %s with a translation key under the API name',
    (value) => {
      const { result } = renderHook(() => usePlanForm(null));
      fillBase(result);
      act(() => {
        result.current.setField('creditConnectorFreeBudgetUsd', value);
      });
      let request: unknown = 'unset';
      act(() => {
        request = result.current.buildCreateRequest();
      });
      expect(request).toBeNull();
      expect(result.current.fieldErrors.creditConnectorFreeBudgetMicroUsd).toBe(
        'adminPlans.form.creditConnectorFreeUsdInvalid',
      );
    },
  );

  it('clears the error when the field is edited again', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('creditConnectorFreeMaxModelOutputUsd', 'oops');
    });
    act(() => {
      result.current.buildCreateRequest();
    });
    expect(result.current.fieldErrors.creditConnectorFreeMaxModelOutputMicroUsd).toBeDefined();

    act(() => {
      result.current.setField('creditConnectorFreeMaxModelOutputUsd', '4');
    });

    expect(result.current.fieldErrors.creditConnectorFreeMaxModelOutputMicroUsd).toBeUndefined();
  });

  it('sends the meter and the limit on an update too', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('creditConnectorFreeBudgetUsd', '0.5');
    });
    expect(result.current.buildUpdateRequest()).toMatchObject({
      creditConnectorFreeBudgetMicroUsd: 500_000,
    });
  });
});

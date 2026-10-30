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

describe('usePlanForm per-call limits (ADR-197)', () => {
  it('starts a new plan with no caps and sends explicit nulls', () => {
    const { result } = renderHook(() => usePlanForm(null));
    expect(result.current.state.maxInputTokensPerCall).toBe('');
    expect(result.current.state.maxCostPerCallUsd).toBe('');
    fillBase(result);
    expect(result.current.buildCreateRequest()).toMatchObject({
      maxInputTokensPerCall: null,
      maxOutputTokensPerCall: null,
      maxCostPerCallMicroUsd: null,
    });
  });

  it('turns typed tokens into integers and typed dollars into exact micro-USD', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('maxInputTokensPerCall', '8000');
      result.current.setField('maxOutputTokensPerCall', '0');
      result.current.setField('maxCostPerCallUsd', '0.05');
    });
    expect(result.current.buildCreateRequest()).toMatchObject({
      maxInputTokensPerCall: 8000,
      maxOutputTokensPerCall: 0,
      maxCostPerCallMicroUsd: 50_000,
    });
  });

  it('loads an existing plan back into form text, null as blank', () => {
    const plan = {
      id: 'p',
      name: 'Free',
      slug: 'free',
      maxInputTokensPerCall: 8000,
      maxOutputTokensPerCall: null,
      maxCostPerCallMicroUsd: 50_000,
    } as unknown as PlanView;
    const { result } = renderHook(() => usePlanForm(plan));
    expect(result.current.state.maxInputTokensPerCall).toBe('8000');
    expect(result.current.state.maxOutputTokensPerCall).toBe('');
    expect(result.current.state.maxCostPerCallUsd).toBe('0.05');
  });

  it('lets an update clear a cap by blanking the field', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('maxInputTokensPerCall', '8000');
    });
    expect(result.current.buildUpdateRequest()).toMatchObject({ maxInputTokensPerCall: 8000 });
    act(() => {
      result.current.setField('maxInputTokensPerCall', '');
    });
    expect(result.current.buildUpdateRequest()).toMatchObject({ maxInputTokensPerCall: null });
  });

  it.each(['-1', '1.5', 'abc', '10000001'])(
    'rejects %s tokens with a translation key under the field name',
    (value) => {
      const { result } = renderHook(() => usePlanForm(null));
      fillBase(result);
      act(() => {
        result.current.setField('maxOutputTokensPerCall', value);
      });
      let request: unknown = 'unset';
      act(() => {
        request = result.current.buildCreateRequest();
      });
      expect(request).toBeNull();
      expect(result.current.fieldErrors.maxOutputTokensPerCall).toBe(
        'adminPlans.form.callLimitTokensInvalid',
      );
    },
  );

  it('rejects a bad dollar amount under the API field name', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('maxCostPerCallUsd', '0.1234567');
    });
    act(() => {
      result.current.buildCreateRequest();
    });
    expect(result.current.fieldErrors.maxCostPerCallMicroUsd).toBe(
      'adminPlans.form.creditConnectorFreeUsdInvalid',
    );
  });

  it('accepts the 10,000,000 boundary', () => {
    const { result } = renderHook(() => usePlanForm(null));
    fillBase(result);
    act(() => {
      result.current.setField('maxInputTokensPerCall', '10000000');
    });
    expect(result.current.buildCreateRequest()).toMatchObject({
      maxInputTokensPerCall: 10_000_000,
    });
  });
});

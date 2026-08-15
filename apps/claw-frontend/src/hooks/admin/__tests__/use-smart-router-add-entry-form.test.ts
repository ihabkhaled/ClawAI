import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RouterConfigurationBillingModel, RouterProvider } from '@/enums/router-configuration.enum';
import { useSmartRouterAddEntryForm } from '@/hooks/admin/use-smart-router-add-entry-form';

describe('useSmartRouterAddEntryForm', () => {
  it('starts with backend-matching defaults', () => {
    const { result } = renderHook(() => useSmartRouterAddEntryForm());
    expect(result.current.provider).toBe(RouterProvider.ANTHROPIC);
    expect(result.current.billingModel).toBe(RouterConfigurationBillingModel.UNKNOWN);
    expect(result.current.attemptTimeoutMs).toBe(1600);
    expect(result.current.retries).toBe(0);
    expect(result.current.modelAlias).toBe('');
  });

  it('rejects a blank model alias', () => {
    const { result } = renderHook(() => useSmartRouterAddEntryForm());
    let input: ReturnType<typeof result.current.buildInput> = null;
    act(() => {
      input = result.current.buildInput();
    });
    expect(input).toBeNull();
    expect(result.current.fieldErrors.modelAlias).toBeDefined();
  });

  it('builds a valid input, trimming the alias and splitting triggers', () => {
    const { result } = renderHook(() => useSmartRouterAddEntryForm());
    act(() => {
      result.current.setModelAlias('  claude-sonnet-4-5  ');
      result.current.setTriggers('low_confidence, timeout ,  ');
    });
    const input = result.current.buildInput();
    if (input === null) {
      throw new Error('input should not be null');
    }
    expect(input.modelAlias).toBe('claude-sonnet-4-5');
    expect(input.triggers).toEqual(['low_confidence', 'timeout']);
    expect(input.deploymentId).toBeUndefined();
  });

  it('reset returns every field to its default', () => {
    const { result } = renderHook(() => useSmartRouterAddEntryForm());
    act(() => {
      result.current.setModelAlias('custom-model');
      result.current.setRetries(5);
    });
    expect(result.current.modelAlias).toBe('custom-model');
    act(() => result.current.reset());
    expect(result.current.modelAlias).toBe('');
    expect(result.current.retries).toBe(0);
  });
});

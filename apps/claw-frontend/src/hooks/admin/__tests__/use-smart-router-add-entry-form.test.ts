import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouterConfigurationBillingModel, RouterProvider } from '@/enums/router-configuration.enum';
import { useSmartRouterAddEntryForm } from '@/hooks/admin/use-smart-router-add-entry-form';

// The catalog is a network query; this suite is about the form's own rules, so
// it is stubbed with a fixed two-provider catalog rather than wired to a
// QueryClient.
const CATALOG = [
  {
    id: 'dep-anthropic-1',
    provider: RouterProvider.ANTHROPIC,
    providerModelId: 'claude-sonnet-4-5',
    isValidated: true,
  },
  {
    id: 'dep-gemini-1',
    provider: RouterProvider.GEMINI,
    providerModelId: 'gemini-3.5-flash-lite',
    isValidated: false,
  },
];

vi.mock('@/hooks/admin/use-smart-router-selectable-deployments', () => ({
  useSmartRouterSelectableDeployments: () => ({
    deployments: CATALOG,
    isLoading: false,
    isError: false,
  }),
}));

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

  // A chain entry names a model on ONE provider, so offering the rest would
  // only invite a pair that cannot resolve.
  it('offers only the catalog models for the selected provider', () => {
    const { result } = renderHook(() => useSmartRouterAddEntryForm());

    expect(result.current.modelOptions.map((option) => option.providerModelId)).toEqual([
      'claude-sonnet-4-5',
    ]);

    act(() => {
      result.current.setProvider(RouterProvider.GEMINI);
    });

    expect(result.current.modelOptions.map((option) => option.providerModelId)).toEqual([
      'gemini-3.5-flash-lite',
    ]);
  });

  // Picking a model pins the exact endpoint, so the entry never depends on a
  // name being matched again later.
  it('binds the chosen model deployment', () => {
    const { result } = renderHook(() => useSmartRouterAddEntryForm());

    act(() => {
      result.current.setModelAlias('claude-sonnet-4-5');
    });

    expect(result.current.deploymentId).toBe('dep-anthropic-1');
    expect(result.current.buildInput()?.deploymentId).toBe('dep-anthropic-1');
  });

  // The old free-text field let a model survive a provider change, submitting a
  // pair that could never resolve.
  it('clears the chosen model when the provider changes', () => {
    const { result } = renderHook(() => useSmartRouterAddEntryForm());

    act(() => {
      result.current.setModelAlias('claude-sonnet-4-5');
    });
    act(() => {
      result.current.setProvider(RouterProvider.GEMINI);
    });

    expect(result.current.modelAlias).toBe('');
    expect(result.current.deploymentId).toBe('');
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

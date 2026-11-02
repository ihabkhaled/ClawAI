import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreditFallbackMode } from '@/enums';
import { useCreditFallbackMode } from '@/hooks/settings/use-credit-fallback-mode';

describe('useCreditFallbackMode', () => {
  it('defaults to FALLBACK when nothing (or something unknown) is saved', () => {
    expect(
      renderHook(() => useCreditFallbackMode(undefined, vi.fn())).result.current
        .currentCreditFallbackMode,
    ).toBe(CreditFallbackMode.Fallback);
    expect(
      renderHook(() => useCreditFallbackMode('bogus', vi.fn())).result.current
        .currentCreditFallbackMode,
    ).toBe(CreditFallbackMode.Fallback);
  });

  it('exposes a saved STOP', () => {
    const { result } = renderHook(() => useCreditFallbackMode('STOP', vi.fn()));
    expect(result.current.currentCreditFallbackMode).toBe(CreditFallbackMode.Stop);
  });

  it('saves a changed mode through the shared preferences mutation', () => {
    const updatePreferences = vi.fn();
    const { result } = renderHook(() => useCreditFallbackMode(null, updatePreferences));
    result.current.handleCreditFallbackModeChange('STOP');
    result.current.handleCreditFallbackModeChange('FALLBACK');
    expect(updatePreferences).toHaveBeenNthCalledWith(1, { creditFallbackMode: 'STOP' });
    expect(updatePreferences).toHaveBeenNthCalledWith(2, { creditFallbackMode: 'FALLBACK' });
  });

  it('never sends an unrecognised value', () => {
    const updatePreferences = vi.fn();
    const { result } = renderHook(() => useCreditFallbackMode(null, updatePreferences));
    result.current.handleCreditFallbackModeChange('NOPE');
    expect(updatePreferences).not.toHaveBeenCalled();
  });
});

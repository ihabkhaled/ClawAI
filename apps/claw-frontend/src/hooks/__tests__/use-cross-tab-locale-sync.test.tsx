import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCrossTabLocaleSync } from '@/hooks/use-cross-tab-locale-sync';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/i18n.constants';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('useCrossTabLocaleSync', () => {
  beforeEach(() => {
    replace.mockClear();
    window.history.replaceState(null, '', '/en/pricing?interval=yearly#plans');
  });

  it('navigates another tab immediately while preserving path, query and hash', () => {
    renderHook(() => useCrossTabLocaleSync());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: LOCALE_STORAGE_KEY, newValue: 'ar' }),
      );
    });

    expect(replace).toHaveBeenCalledWith('/ar/pricing?interval=yearly#plans');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('ignores unrelated, invalid and already-active locale events', () => {
    renderHook(() => useCrossTabLocaleSync());

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'ar' }));
      window.dispatchEvent(
        new StorageEvent('storage', { key: LOCALE_STORAGE_KEY, newValue: 'invalid' }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', { key: LOCALE_STORAGE_KEY, newValue: 'en' }),
      );
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it('removes its storage listener when the provider unmounts', () => {
    const { unmount } = renderHook(() => useCrossTabLocaleSync());
    unmount();

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: LOCALE_STORAGE_KEY, newValue: 'ar' }),
      );
    });

    expect(replace).not.toHaveBeenCalled();
  });
});

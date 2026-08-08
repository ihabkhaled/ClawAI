import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { useMarketingLocaleSwitcher } from '@/hooks/marketing/use-marketing-locale-switcher';

const mocks = vi.hoisted(() => ({
  replaceLocale: vi.fn(),
  setLocale: vi.fn(),
}));

vi.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: Locale.EN, setLocale: mocks.setLocale }),
}));

vi.mock('@/hooks/use-locale-navigation', () => ({
  useLocaleNavigation: () => ({ replaceLocale: mocks.replaceLocale }),
}));

describe('useMarketingLocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a pending state before navigating to another locale', () => {
    const { result } = renderHook(() => useMarketingLocaleSwitcher());

    act(() => result.current.handleLocaleChange(Locale.AR));

    expect(result.current.isPending).toBe(true);
    expect(mocks.setLocale).toHaveBeenCalledWith(Locale.AR);
    expect(mocks.replaceLocale).toHaveBeenCalledWith(Locale.AR);
  });

  it('does nothing when the selected locale is already active', () => {
    const { result } = renderHook(() => useMarketingLocaleSwitcher());

    act(() => result.current.handleLocaleChange(Locale.EN));

    expect(result.current.isPending).toBe(false);
    expect(mocks.setLocale).not.toHaveBeenCalled();
    expect(mocks.replaceLocale).not.toHaveBeenCalled();
  });
});

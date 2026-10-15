import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePreferenceBootstrap } from '@/hooks/settings/use-preference-bootstrap';

const replaceLocale = vi.fn();
const setLocale = vi.fn();
let pathname = '/ar/threads/review/pub-1';

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({
    user: {
      languagePreference: 'EN',
      appearancePreference: 'SYSTEM',
      currencyPreferenceMode: 'AUTO',
    },
  }),
}));
vi.mock('@/hooks/display-currency/use-display-currency', () => ({
  useDisplayCurrency: () => ({ currency: 'USD', selectCurrency: vi.fn() }),
}));
vi.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ setLocale }) }));
vi.mock('@/hooks/use-locale-navigation', () => ({
  useLocaleNavigation: () => ({ pathname, replaceLocale }),
}));
vi.mock('@/hooks/use-theme', () => ({ useAppTheme: () => ({ setTheme: vi.fn() }) }));

describe('usePreferenceBootstrap locale', () => {
  beforeEach(() => {
    replaceLocale.mockReset();
    setLocale.mockReset();
  });

  it.each(['/ar/threads/review/pub-1', '/ar/threads/my/suggestions'])(
    'keeps the URL locale on %s although the stored language is English',
    (path) => {
      pathname = path;
      renderHook(() => usePreferenceBootstrap());
      expect(replaceLocale).not.toHaveBeenCalled();
      expect(setLocale).not.toHaveBeenCalled();
    },
  );

  it('still applies the stored language on other portal routes', () => {
    pathname = '/ar/chat';
    renderHook(() => usePreferenceBootstrap());
    expect(replaceLocale).toHaveBeenCalledWith('en');
  });
});

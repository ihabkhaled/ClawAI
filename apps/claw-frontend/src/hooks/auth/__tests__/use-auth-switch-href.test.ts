import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthSwitchHref } from '@/hooks/auth/use-auth-switch-href';

let search = '';
let currentLocale = 'en';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: currentLocale }),
}));

describe('useAuthSwitchHref', () => {
  beforeEach(() => {
    search = '';
    currentLocale = 'en';
  });

  it.each(['en', 'ar', 'fa', 'ja', 'de'])(
    'links sign-in to sign-up in /%s and keeps the page the reader came from',
    (locale) => {
      currentLocale = locale;
      search = 'returnTo=%2Fthreads%2Fclear-writing';
      const { result } = renderHook(() => useAuthSwitchHref('/register'));
      expect(result.current).toBe(`/${locale}/register?returnTo=%2Fthreads%2Fclear-writing`);
    },
  );

  it('adds nothing when there is no return target', () => {
    currentLocale = 'ar';
    const { result } = renderHook(() => useAuthSwitchHref('/login'));
    expect(result.current).toBe('/ar/login');
  });

  it('drops a return target that is not a safe path on this site', () => {
    currentLocale = 'de';
    search = 'returnTo=https%3A%2F%2Fevil.example';
    const { result } = renderHook(() => useAuthSwitchHref('/login'));
    expect(result.current).toBe('/de/login');
  });
});

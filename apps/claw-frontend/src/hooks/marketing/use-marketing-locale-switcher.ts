'use client';

import { useCallback } from 'react';

import type { Locale } from '@/enums/locale.enum';
import { useLocale } from '@/hooks/use-locale';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import type { UseMarketingLocaleSwitcherReturn } from '@/types';

// Public-surface variant of the locale switcher: updates context + persists
// to localStorage only, via setLocale(). It deliberately does NOT call the
// authenticated preferences mutation the portal's LocaleSwitcher uses —
// anonymous visitors have no session to persist a preference against.
export function useMarketingLocaleSwitcher(): UseMarketingLocaleSwitcherReturn {
  const { locale, setLocale } = useLocale();

  const handleLocaleChange = useCallback(
    (newLocale: Locale): void => {
      setLocale(newLocale);
    },
    [setLocale],
  );

  return { locale, options: SUPPORTED_LOCALES, handleLocaleChange };
}

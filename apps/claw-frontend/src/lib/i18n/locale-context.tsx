'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/enums/locale.enum';
import type { LocaleContextValue, LocaleProviderProps } from '@/types/i18n.types';
import { getDirection, getStoredLocale, persistLocale } from '@/utilities/locale.utility';

import { DEFAULT_LOCALE } from './i18n.constants';

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps): React.ReactNode {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (!initialLocale) {
      setLocaleState(getStoredLocale());
    }
    setHydrated(true);
  }, [initialLocale]);

  // Sync document dir attribute when locale changes (only after hydration)
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const dir = getDirection(locale);
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale, hydrated]);

  const setLocale = useCallback((newLocale: Locale): void => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  }, []);

  const dir = getDirection(locale);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir, setLocale }),
    [locale, dir, setLocale],
  );

  return <LocaleContext value={value}>{children}</LocaleContext>;
}

'use client';

import { createContext, useCallback, useEffect, useMemo } from 'react';

import type { Locale } from '@/enums/locale.enum';
import type { LocaleContextValue, LocaleProviderProps } from '@/types/i18n.types';
import { getDirection, getHtmlLanguage, persistLocale } from '@/utilities/locale.utility';

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({
  children,
  initialLocale,
  initialDictionary,
}: LocaleProviderProps): React.ReactNode {
  // The URL-derived server locale is authoritative. This effect is only a
  // defensive sync for client transitions; localStorage never selects the
  // language for an already-prefixed route.
  useEffect(() => {
    const dir = getDirection(initialLocale);
    document.documentElement.dir = dir;
    document.documentElement.lang = getHtmlLanguage(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback((newLocale: Locale): void => {
    persistLocale(newLocale);
  }, []);

  const dir = getDirection(initialLocale);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: initialLocale,
      dir,
      dictionary: initialDictionary,
      setLocale,
    }),
    [initialLocale, dir, initialDictionary, setLocale],
  );

  return <LocaleContext value={value}>{children}</LocaleContext>;
}

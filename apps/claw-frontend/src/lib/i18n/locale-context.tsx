'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useEffect, useMemo } from 'react';

import type { Locale } from '@/enums/locale.enum';
import type { LocaleContextValue, LocaleProviderProps } from '@/types/i18n.types';
import {
  getDirection,
  getHtmlLanguage,
  parseLocaleFromPathname,
  persistLocale,
} from '@/utilities/locale.utility';

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({
  children,
  initialLocale,
  initialDictionary,
}: LocaleProviderProps): React.ReactNode {
  // The URL is authoritative, and it is watched on EVERY navigation — not just
  // read once from the server-rendered prop.
  //
  // `<html>` is a pre-existing DOM node, so React never patches its attributes
  // after hydration, and the root layout that renders them does not re-run on a
  // client transition. Signing in on /ar as a user whose language is English
  // does exactly that transition (usePreferenceBootstrap calls
  // router.replace('/en/...')): the dictionary swapped to English while
  // `dir="rtl"` stayed, leaving English text in a right-to-left sidebar.
  const pathname = usePathname();
  const activeLocale = parseLocaleFromPathname(pathname ?? '') ?? initialLocale;

  useEffect(() => {
    document.documentElement.dir = getDirection(activeLocale);
    document.documentElement.lang = getHtmlLanguage(activeLocale);
  }, [activeLocale]);

  const setLocale = useCallback((newLocale: Locale): void => {
    persistLocale(newLocale);
  }, []);

  const dir = getDirection(activeLocale);

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

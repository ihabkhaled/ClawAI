import { useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import { localizeHref } from '@/utilities/locale.utility';

/**
 * Puts the language the reader is in at the front of an internal path (`/login` becomes
 * `/ar/login` on an Arabic page). A path without a language is answered by the router with a
 * redirect to the default language, which would send an Arabic or Japanese reader to the English
 * sign-in page; this keeps them in theirs.
 */
export function useLocalizedHref(): (path: string) => string {
  const { locale } = useTranslation();
  return useCallback((path: string) => localizeHref(path, locale), [locale]);
}

import { useCallback } from 'react';

import { useLocale } from '@/hooks/use-locale';
import type { UseTranslationReturn } from '@/types/i18n.types';

import { getTranslation } from './translations';

export function useTranslation(): UseTranslationReturn {
  const { locale, dir } = useLocale();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string =>
      getTranslation(locale, key, params),
    [locale],
  );

  return { t, locale, dir };
}

import { useCallback } from 'react';

import { useLocale } from '@/hooks/use-locale';
import type { UseTranslationReturn } from '@/types/i18n.types';

import { resolveTranslation } from './translation-resolver';

export function useTranslation(): UseTranslationReturn {
  const { locale, dir, dictionary } = useLocale();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string =>
      resolveTranslation(dictionary, key, params),
    [dictionary],
  );

  return { t, locale, dir };
}

import { useCallback } from 'react';

import { useLocale } from '@/hooks/use-locale';
import type { ThreadListTranslate } from '@/types/thread-list.types';
import { fillThreadListText, threadListStrings } from '@/utilities/thread-list-text.utility';

/** Translator for the Threads list strings (own module, 13 locales). */
export function useThreadListText(): ThreadListTranslate {
  const { locale } = useLocale();
  return useCallback(
    (key, params) => fillThreadListText(threadListStrings(locale)[key], params),
    [locale],
  );
}

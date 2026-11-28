import { useCallback, useContext } from 'react';

import { Locale } from '@/enums/locale.enum';
import { LocaleContext } from '@/lib/i18n/locale-context';
import type { TranslateFunction } from '@/types/i18n.types';
import type { NarrationEntry, UseNarrationLogReturn } from '@/types/narration.types';
import { describeNarrationEntry } from '@/utilities/narration.utility';

/**
 * How each work-log line reads in the current language: the locale picks the plural form of a
 * counter and names the searched languages. English outside a provider, so isolated renders work.
 */
export function useNarrationLog(t: TranslateFunction): UseNarrationLogReturn {
  const locale = useContext(LocaleContext)?.locale ?? Locale.EN;
  const describe = useCallback(
    (entry: NarrationEntry) => describeNarrationEntry(entry, t, locale),
    [t, locale],
  );
  return { describe };
}

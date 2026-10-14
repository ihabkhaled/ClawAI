import { useCallback, useContext } from 'react';

import { Locale } from '@/enums/locale.enum';
import { LocaleContext } from '@/lib/i18n/locale-context';
import type { PluginsTranslate } from '@/types/plugins.types';
import { pluralText } from '@/utilities/plural-text.utility';

/** `plural(t, 'base', n)` for the current language; English outside a provider so isolated renders still work. */
export function usePluralText(): (t: PluginsTranslate, base: string, count: number) => string {
  const locale = useContext(LocaleContext)?.locale ?? Locale.EN;
  return useCallback(
    (t: PluginsTranslate, base: string, count: number) => pluralText(t, locale, base, count),
    [locale],
  );
}

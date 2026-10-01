import { useContext } from 'react';

import { LocaleContext } from '@/lib/i18n/locale-context';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';

/**
 * The translated "Close" for dialog and sheet corner buttons.
 *
 * Reads the locale context directly instead of `useTranslation` because those
 * primitives also render in trees with no LocaleProvider (isolated tests,
 * error boundaries), where `useLocale` throws.
 */
export function useCloseLabel(): string {
  const context = useContext(LocaleContext);
  return context === undefined ? 'Close' : resolveTranslation(context.dictionary, 'common.close');
}

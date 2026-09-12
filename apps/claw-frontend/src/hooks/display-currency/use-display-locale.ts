'use client';

import { useContext } from 'react';

import { DEFAULT_DISPLAY_LOCALE } from '@/constants/display-currency.constants';
import { LocaleContext } from '@/lib/i18n/locale-context';

/**
 * The viewer's locale, for number formatting, without requiring a provider.
 *
 * `useTranslation` throws outside a LocaleProvider, which is correct for text —
 * a missing translation should be loud. It is wrong for money: the billing
 * components take `t` as a prop and are rendered standalone all over the test
 * suite, and a currency figure that crashes a tree because nobody mounted a
 * locale provider is a worse outcome than one formatted in English.
 */
export function useDisplayLocale(): string {
  return useContext(LocaleContext)?.locale ?? DEFAULT_DISPLAY_LOCALE;
}

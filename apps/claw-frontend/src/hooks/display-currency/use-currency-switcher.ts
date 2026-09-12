'use client';

import { SUPPORTED_DISPLAY_CURRENCIES } from '@claw/shared-constants';
import { useMemo } from 'react';

import {
  DISPLAY_CURRENCY_AUTO,
  POPULAR_DISPLAY_CURRENCIES,
} from '@/constants/display-currency.constants';
import { useDisplayCurrency } from '@/hooks/display-currency/use-display-currency';
import type { CurrencySwitcherOption, CurrencySwitcherState } from '@/types/display-currency.types';
import { currencyDisplayName } from '@/utilities/display-currency.utility';

/**
 * The options and state behind the currency selector.
 *
 * Sixty codes in one flat list is a scroll, not a choice, so the handful ClawAI
 * traffic actually uses come first and the rest follow alphabetically.
 */
export function useCurrencySwitcher(locale: string): CurrencySwitcherState {
  const { context, currency, isSwitching, selectCurrency } = useDisplayCurrency();

  const options = useMemo<CurrencySwitcherOption[]>(() => {
    const all = Object.keys(SUPPORTED_DISPLAY_CURRENCIES).sort();
    const popular = POPULAR_DISPLAY_CURRENCIES.filter((code) => all.includes(code));
    const rest = all.filter((code) => !popular.includes(code));
    return [...popular, ...rest].map((code) => ({
      code,
      // The currency's own name in the viewer's language, from Intl rather than
      // a table ClawAI would have to translate thirteen times and keep current.
      label: currencyDisplayName(code, locale),
      isPopular: popular.includes(code),
    }));
  }, [locale]);

  return {
    options,
    // What is actually on screen, which is USD whenever conversion failed. A
    // selector showing EGP over a page of dollars is lying about its own state.
    activeCurrency: currency,
    detectedCountry: context?.countryCode ?? null,
    isAutomatic: context?.mode !== 'MANUAL',
    isSwitching,
    selectCurrency,
    selectAutomatic: () => {
      selectCurrency(DISPLAY_CURRENCY_AUTO);
    },
  };
}

'use client';

import { DisplayRoundingPolicy } from '@claw/shared-types';
import { useCallback } from 'react';

import { useDisplayCurrency } from '@/hooks/display-currency/use-display-currency';
import { useDisplayLocale } from '@/hooks/display-currency/use-display-locale';
import type { MoneyFormatter } from '@/types/display-currency.types';
import { formatLocalizedMoney } from '@/utilities/display-currency.utility';

/**
 * A stable formatter, for rendering a LIST of amounts.
 *
 * `useLocalizedMoney` is the right tool for a single figure, but a hook cannot
 * be called once per row of a `.map`. This returns a plain function that can,
 * and it goes through exactly the same conversion and formatting so a list and
 * a detail view can never disagree about the same amount.
 */
export function useMoneyFormatter(): MoneyFormatter {
  const { localize } = useDisplayCurrency();
  const locale = useDisplayLocale();

  return useCallback(
    (
      canonicalAmountMinor: number,
      canonicalCurrency: string,
      policy: DisplayRoundingPolicy = DisplayRoundingPolicy.COMMERCIAL_PRICE,
    ): string =>
      formatLocalizedMoney(localize(canonicalAmountMinor, canonicalCurrency, policy), locale),
    [localize, locale],
  );
}

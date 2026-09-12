'use client';

import { DisplayRoundingPolicy } from '@claw/shared-types';
import { useMemo } from 'react';

import { useDisplayCurrency } from '@/hooks/display-currency/use-display-currency';
import { useTranslation } from '@/lib/i18n';
import type { LocalizedMoneyDisplay } from '@/types/display-currency.types';
import { formatCanonicalMoney, formatLocalizedMoney } from '@/utilities/display-currency.utility';

/**
 * Turns a canonical minor-unit amount into everything a surface needs to render
 * it: the localized text, the canonical text for a secondary line, and whether
 * the figure is an estimate.
 *
 * Every money surface uses this. Formatting in place is how "approximate" ends
 * up on the pricing page and missing from the checkout summary, and how two
 * screens showing the same plan disagree by a rounding step.
 */
export function useLocalizedMoney(
  canonicalAmountMinor: number,
  canonicalCurrency: string,
  policy: DisplayRoundingPolicy = DisplayRoundingPolicy.COMMERCIAL_PRICE,
): LocalizedMoneyDisplay {
  const { localize } = useDisplayCurrency();
  const { locale } = useTranslation();

  return useMemo(() => {
    const view = localize(canonicalAmountMinor, canonicalCurrency, policy);
    return {
      view,
      text: formatLocalizedMoney(view, locale),
      // Null unless a conversion happened, so a caller can render the second
      // line unconditionally and get nothing when it would be noise.
      canonicalText: formatCanonicalMoney(view, locale),
      isApproximate: view.approximate,
    };
  }, [localize, canonicalAmountMinor, canonicalCurrency, policy, locale]);
}

'use client';

import type {
  DisplayCurrencyContext as DisplayContext,
  LocalizedMoneyView,
} from '@claw/shared-types';
import { DisplayRoundingPolicy } from '@claw/shared-types';
import { toLocalizedMoneyView } from '@claw/shared-utilities/money';
import { createContext, useCallback, useMemo, useState, useTransition } from 'react';

import { DISPLAY_CURRENCY_AUTO } from '@/constants/display-currency.constants';
import type {
  DisplayCurrencyContextValue,
  DisplayCurrencyProviderProps,
} from '@/types/display-currency.types';
import { fetchClientDisplayContext } from '@/utilities/display-currency-client.utility';

export const DisplayCurrencyReactContext = createContext<DisplayCurrencyContextValue | undefined>(
  undefined,
);

export function DisplayCurrencyProvider({
  children,
  initialContext,
}: DisplayCurrencyProviderProps): React.ReactNode {
  const [context, setContext] = useState<DisplayContext | null>(initialContext);
  const [isSwitching, startSwitching] = useTransition();

  const selectCurrency = useCallback((currency: string): void => {
    startSwitching(() => {
      void fetchClientDisplayContext(currency).then((resolved) => {
        // A failed switch keeps whatever was already on screen. Blanking every
        // price because one fetch failed would be a worse answer than the
        // currency the user had a moment ago.
        if (resolved !== null) {
          setContext(resolved);
        }
      });
    });
  }, []);

  const localize = useCallback(
    (
      canonicalAmountMinor: number,
      canonicalCurrency: string,
      policy: DisplayRoundingPolicy = DisplayRoundingPolicy.COMMERCIAL_PRICE,
    ): LocalizedMoneyView =>
      toLocalizedMoneyView(canonicalAmountMinor, canonicalCurrency, context, policy),
    [context],
  );

  const value = useMemo<DisplayCurrencyContextValue>(
    () => ({
      context,
      // What is actually being RENDERED. The resolver already downgrades this
      // to USD when no provider could quote, so a selector reading it can never
      // claim EGP while the page shows dollars.
      currency: context?.currencyCode ?? 'USD',
      isSwitching,
      selectCurrency,
      localize,
    }),
    [context, isSwitching, selectCurrency, localize],
  );

  return <DisplayCurrencyReactContext value={value}>{children}</DisplayCurrencyReactContext>;
}

export { DISPLAY_CURRENCY_AUTO };

'use client';

import type {
  DisplayCurrencyContext as DisplayContext,
  LocalizedMoneyView,
} from '@claw/shared-types';
import { CurrencyPreferenceMode, DisplayRoundingPolicy } from '@claw/shared-types';
import { toLocalizedMoneyView } from '@claw/shared-utilities/money';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

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

  // The server resolves the first paint, but it cannot geolocate a request that
  // never crossed the internet — a local install, a corporate NAT, a container
  // network — and correctly refuses to guess from a private address. The
  // browser's time zone is the only signal left, and it exists only here.
  //
  // So: if the server came back with no country while in AUTO, ask again from
  // the client, once, with the time zone attached. Guarded by a ref because
  // this must never become a loop when the answer is still UNRESOLVED.
  const hasRetriedWithTimezoneRef = useRef(false);
  useEffect(() => {
    if (
      hasRetriedWithTimezoneRef.current ||
      context === null ||
      context.mode !== CurrencyPreferenceMode.AUTO ||
      context.countryCode !== null
    ) {
      return;
    }
    hasRetriedWithTimezoneRef.current = true;
    void fetchClientDisplayContext(DISPLAY_CURRENCY_AUTO, { persist: false }).then((resolved) => {
      if (resolved !== null && resolved.countryCode !== null) {
        setContext(resolved);
      }
    });
  }, [context]);

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

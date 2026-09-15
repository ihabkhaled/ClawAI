'use client';

import { useEffect, useRef, useState } from 'react';

import { DISPLAY_CURRENCY_AUTO } from '@/constants/display-currency.constants';
import { useDisplayCurrency } from '@/hooks/display-currency/use-display-currency';
import { fetchClientDisplayContext } from '@/utilities/display-currency-client.utility';

/**
 * The visitor's ISO-3166 country, or null while unknown.
 *
 * Reuses the display-currency detection rather than adding a second geo
 * lookup: same server endpoint, same Country.is signal, same time-zone
 * fallback for requests that never crossed the internet. One detection, two
 * uses — the price and the phone prefix can never disagree about where the
 * visitor is.
 *
 * The currency provider is mounted on marketing routes only, so on /register
 * the context is null and this asks the endpoint directly, once. Never
 * persists a cookie: reading the country is not the user choosing a currency.
 */
export function useDetectedCountry(): string | null {
  const { context } = useDisplayCurrency();
  const [fetched, setFetched] = useState<string | null>(null);
  const hasAskedRef = useRef(false);

  useEffect(() => {
    if (context?.countryCode !== undefined && context.countryCode !== null) {
      return;
    }
    if (hasAskedRef.current) {
      return;
    }
    hasAskedRef.current = true;
    void fetchClientDisplayContext(DISPLAY_CURRENCY_AUTO, { persist: false }).then((resolved) => {
      if (resolved?.countryCode !== undefined && resolved.countryCode !== null) {
        setFetched(resolved.countryCode);
      }
    });
  }, [context]);

  return context?.countryCode ?? fetched;
}

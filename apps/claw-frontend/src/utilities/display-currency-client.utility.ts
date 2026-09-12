import type { DisplayCurrencyContext } from '@claw/shared-types';

import {
  DISPLAY_CURRENCY_AUTO,
  DISPLAY_CURRENCY_ENDPOINT,
  DISPLAY_CURRENCY_FETCH_TIMEOUT_MS,
} from '@/constants/display-currency.constants';
import { buildDisplayCurrencyCookie } from '@/utilities/display-currency.utility';

/**
 * Switches the display currency and re-resolves the context.
 *
 * The choice is persisted in a first-party cookie so the SERVER can honour it
 * on the next navigation's first paint — without that, every page load would
 * start in the detected currency and flip after hydration.
 *
 * Returns null on failure, and the caller keeps whatever was already rendered.
 */
export async function fetchClientDisplayContext(
  currency: string,
): Promise<DisplayCurrencyContext | null> {
  persistDisplayCurrencyChoice(currency);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPLAY_CURRENCY_FETCH_TIMEOUT_MS);
  try {
    const query =
      currency === DISPLAY_CURRENCY_AUTO ? '' : `?currency=${encodeURIComponent(currency)}`;
    const response = await fetch(`${DISPLAY_CURRENCY_ENDPOINT}${query}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as DisplayCurrencyContext;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function persistDisplayCurrencyChoice(currency: string): void {
  try {
    document.cookie = buildDisplayCurrencyCookie(currency);
  } catch {
    // A blocked cookie costs the choice on the next navigation, not this one.
    // Not worth failing a currency switch over.
  }
}

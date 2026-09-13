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
  options: { persist?: boolean } = {},
): Promise<DisplayCurrencyContext | null> {
  // Not persisted when the CLIENT is re-resolving on its own, only when the
  // USER picked something. Writing an AUTO cookie for an automatic retry would
  // turn "has never chosen" into "explicitly chose automatic", and those are
  // different states — the first defers to a later signal, the second is a
  // decision.
  if (options.persist !== false) {
    persistDisplayCurrencyChoice(currency);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPLAY_CURRENCY_FETCH_TIMEOUT_MS);
  try {
    const params = new URLSearchParams();
    if (currency !== DISPLAY_CURRENCY_AUTO) {
      params.set('currency', currency);
    }
    // Sent on every resolve, including a manual one: the server needs it to
    // report the detected country back for the "Automatic — EGP, detected from
    // EG" line, even while a manual choice is overriding it.
    const timezone = readBrowserTimezone();
    if (timezone !== null) {
      params.set('countryHint', timezone);
    }
    const query = params.size > 0 ? `?${params.toString()}` : '';
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

/**
 * The browser's IANA time zone, for AUTO detection.
 *
 * The server cannot geolocate a request that never crossed the internet — a
 * local install, a corporate NAT, a container network — and correctly declines
 * to guess from a private address. This is the one signal that still works
 * there, and without it AUTO always means USD on those deployments.
 *
 * Weak by nature: the browser owns this value. It is consulted only after every
 * trusted signal has failed, and a manual choice always outranks it.
 */
function readBrowserTimezone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone.length > 0 ? zone : null;
  } catch {
    return null;
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

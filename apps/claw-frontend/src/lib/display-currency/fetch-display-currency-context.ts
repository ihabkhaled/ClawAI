import 'server-only';

import type { DisplayCurrencyContext } from '@claw/shared-types';

import {
  DISPLAY_CURRENCY_AUTO,
  DISPLAY_CURRENCY_FETCH_TIMEOUT_MS,
} from '@/constants/display-currency.constants';
import { readDisplayCurrencyCookie } from '@/utilities/display-currency.utility';

const DISPLAY_CURRENCY_PATH = '/api/v1/billing/display-currency';

/**
 * Resolves the display context on the SERVER, for the first paint.
 *
 * Resolving here rather than after hydration is what stops a visitor seeing
 * "$10" turn into "≈ EGP 515" a moment later. It also means the visitor's
 * browser never talks to an FX provider: one server-side cache serves everyone
 * and nobody's browsing is handed to a third party.
 *
 * Returns null on ANY failure. A null context renders canonical USD, which is a
 * working page — waiting on a free FX API for a currency symbol is not.
 */
export async function fetchDisplayCurrencyContext(
  headers: Headers,
): Promise<DisplayCurrencyContext | null> {
  const origin = getPaymentServiceOrigin();
  if (origin === null) {
    return null;
  }

  const anonymous = readDisplayCurrencyCookie(headers.get('cookie'));
  const params = new URLSearchParams();
  // "AUTO" is a decision, not a currency: it means the visitor explicitly asked
  // for detection, so it is not forwarded as a currency override.
  if (anonymous !== null && anonymous !== DISPLAY_CURRENCY_AUTO) {
    params.set('currency', anonymous);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPLAY_CURRENCY_FETCH_TIMEOUT_MS);
  try {
    const query = params.size > 0 ? `?${params.toString()}` : '';
    const response = await fetch(`${origin}${DISPLAY_CURRENCY_PATH}${query}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // Forwarded so payment-service geolocates THIS visitor rather than the
        // Next.js server. Only the header nginx overwrites is passed on; the
        // spoofable ones are neither forwarded here nor trusted there.
        ...forwardTrustedClientHeaders(headers),
      },
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

function forwardTrustedClientHeaders(headers: Headers): Record<string, string> {
  const realIp = headers.get('x-real-ip');
  return realIp === null ? {} : { 'x-real-ip': realIp };
}

function getPaymentServiceOrigin(): string | null {
  const raw = process.env['PAYMENT_SERVICE_URL'];
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return raw.trim().replace(/\/$/u, '');
}

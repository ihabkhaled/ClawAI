import {
  DISPLAY_CURRENCY_COOKIE_MAX_AGE_S,
  DISPLAY_CURRENCY_COOKIE_MAX_LENGTH,
  DISPLAY_CURRENCY_COOKIE_NAME,
  SUPPORTED_DISPLAY_CURRENCIES,
} from '@claw/shared-constants';
import type { LocalizedMoneyView } from '@claw/shared-types';

import { DISPLAY_CURRENCY_AUTO } from '@/constants/display-currency.constants';

/**
 * Formats a localized amount for display.
 *
 * The ONLY function that turns a `LocalizedMoneyView` into text. Every money
 * surface calls it, so "approximate" cannot be remembered on one card and
 * forgotten on the next, and a currency's real decimal count is looked up once
 * rather than assumed to be two in sixty places.
 *
 * Display only. Nothing returned here is ever sent back to a server or used to
 * compute a charge — the authoritative amount lives in the immutable price
 * version and the server's own quote.
 */
export function formatLocalizedMoney(
  view: LocalizedMoneyView,
  locale: string,
  options: { approximatePrefix?: string; belowMinimumPrefix?: string } = {},
): string {
  const amount = formatCurrencyAmount(view.displayAmountMinor, view.displayCurrency, locale);

  // A real charge that renders as "0.00" has told the user they paid nothing.
  // Below the smallest unit the honest answer is "less than one of these".
  if (view.canonicalAmountMinor !== 0 && view.displayAmountMinor === 0) {
    const smallest = formatCurrencyAmount(1, view.displayCurrency, locale);
    return `${options.belowMinimumPrefix ?? '<'} ${smallest}`;
  }

  // The tilde is a prefix, not decoration: a converted price is an estimate and
  // saying so is the difference between an approximation and a promise.
  return view.approximate ? `${options.approximatePrefix ?? '≈'} ${amount}` : amount;
}

/**
 * The canonical amount, for the "≈ EGP 515 / USD 10.00" second line.
 *
 * Returns null when there is nothing to disambiguate, so a caller can render
 * the second line unconditionally and get nothing when it would be noise.
 */
export function formatCanonicalMoney(view: LocalizedMoneyView, locale: string): string | null {
  if (!view.approximate) {
    return null;
  }
  return formatCurrencyAmount(view.canonicalAmountMinor, view.canonicalCurrency, locale);
}

export function formatCurrencyAmount(
  amountMinor: number,
  currency: string,
  locale: string,
): string {
  const fractionDigits = displayFractionDigits(currency);
  const divisor = 10 ** fractionDigits;
  const negative = amountMinor < 0;
  const absolute = Math.abs(amountMinor);
  // The decimal string is built by integer arithmetic; Intl only places the
  // symbol, localizes the digits (Arabic-Indic for `ar`) and gets the bidi
  // ordering right. No float decides WHAT the number is, only how it prints.
  const decimal = `${Math.trunc(absolute / divisor)}.${String(absolute % divisor).padStart(fractionDigits, '0')}`;
  const value = Number(decimal) * (negative ? -1 : 1);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    // An unknown currency or locale must not blow up a billing page. The exact
    // figure is still correct; only the localization is lost.
    return `${decimal} ${currency}`;
  }
}

// Never assume cents. JPY has none and KWD has three, and a dinar rendered with
// two decimals is a price ten times wrong.
export function displayFractionDigits(currency: string): number {
  return SUPPORTED_DISPLAY_CURRENCIES[currency] ?? 2;
}

/**
 * Reads the anonymous currency choice out of a cookie string.
 *
 * Validated on every read, never on write alone. The cookie is not
 * authoritative and a visitor can edit it freely — that is allowed, because
 * choosing a display currency is their business. What it must never do is reach
 * a cache key, a provider URL or a Redis namespace unchecked.
 */
export function readDisplayCurrencyCookie(cookieHeader: string | null | undefined): string | null {
  if (cookieHeader === null || cookieHeader === undefined) {
    return null;
  }
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.split('=');
    if (rawName?.trim() !== DISPLAY_CURRENCY_COOKIE_NAME) {
      continue;
    }
    const raw = rest.join('=').trim();
    if (raw.length === 0 || raw.length > DISPLAY_CURRENCY_COOKIE_MAX_LENGTH) {
      return null;
    }
    const value = raw.toUpperCase();
    if (value === DISPLAY_CURRENCY_AUTO) {
      return DISPLAY_CURRENCY_AUTO;
    }
    return Object.hasOwn(SUPPORTED_DISPLAY_CURRENCIES, value) ? value : null;
  }
  return null;
}

export function buildDisplayCurrencyCookie(value: string): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return [
    `${DISPLAY_CURRENCY_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${String(DISPLAY_CURRENCY_COOKIE_MAX_AGE_S)}`,
    // Lax, not Strict: a visitor arriving from a search result or a shared link
    // should still see the currency they chose, and there is nothing here worth
    // protecting from a cross-site read.
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ]
    .filter((segment) => segment.length > 0)
    .join('; ');
}

/**
 * The currency's own name in the viewer's language.
 *
 * Read from `Intl` rather than a table ClawAI would have to translate thirteen
 * times and keep current as currencies change. An old runtime or an unknown
 * locale loses the friendly name, not the option itself.
 */
export function currencyDisplayName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

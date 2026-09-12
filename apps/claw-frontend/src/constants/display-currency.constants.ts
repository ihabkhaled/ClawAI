// The sentinel stored in the anonymous cookie when the visitor has explicitly
// asked for automatic detection. Distinct from an ABSENT cookie, which means
// they have never chosen: "AUTO" is a decision and deleting the cookie is not.
export const DISPLAY_CURRENCY_AUTO = 'AUTO';

// Offered first in the selector. Sixty codes in a flat list is a scroll, not a
// choice — these are the ones ClawAI's traffic actually uses, and the rest stay
// reachable by search.
export const POPULAR_DISPLAY_CURRENCIES: readonly string[] = Object.freeze([
  'USD',
  'EUR',
  'GBP',
  'EGP',
  'AED',
  'SAR',
  'INR',
  'JPY',
]);

// The public resolver in payment-service.
export const DISPLAY_CURRENCY_ENDPOINT = '/api/v1/billing/display-currency';

// Display FX is a presentation enhancement. It must never be able to hold a
// page open waiting for a currency symbol.
export const DISPLAY_CURRENCY_FETCH_TIMEOUT_MS = 2_500;

// Fallback for number formatting when no locale provider is mounted. English
// digits and grouping are wrong for nobody's comprehension, only their
// preference — a crash would be wrong for everybody.
export const DEFAULT_DISPLAY_LOCALE = 'en';

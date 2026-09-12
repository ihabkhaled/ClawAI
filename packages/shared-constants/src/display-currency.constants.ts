import { FX_RATE_SCALE } from './billing.constants';

// ---- DISPLAY currency (presentation only) ----
//
// This file describes the currencies ClawAI can SHOW a price in. It is NOT the
// set of currencies ClawAI can CHARGE in — that is SUPPORTED_BILLING_CURRENCIES
// in billing.constants.ts, and it is deliberately much smaller.
//
// Widening the display set is a presentation change. Widening the billing set
// would let a checkout be created in a currency no gateway settles, which is a
// wrong charge. The two sets are separate on purpose and a test asserts that
// every billing currency is also displayable, never the reverse.

// The canonical currency every price is stored and reasoned about in.
export const DISPLAY_BASE_CURRENCY = 'USD';

// ISO-4217 fiat only, mapped to its minor-unit exponent.
//
// The fallback FX provider also serves crypto and metals. Exposing those merely
// because upstream returns them would put "BTC" in a currency picker next to
// "EUR", so this allowlist is the gate: an asset absent from this map is not a
// display currency, whatever any provider says.
//
// The exponent is NOT assumed to be 2. JPY has 0 and KWD has 3; treating a
// dinar as two-decimal renders a price ten times wrong.
export const SUPPORTED_DISPLAY_CURRENCIES: Readonly<Record<string, number>> = Object.freeze({
  AED: 2,
  ARS: 2,
  AUD: 2,
  BDT: 2,
  BGN: 2,
  BHD: 3,
  BRL: 2,
  CAD: 2,
  CHF: 2,
  CLP: 0,
  CNY: 2,
  COP: 2,
  CZK: 2,
  DKK: 2,
  DZD: 2,
  EGP: 2,
  EUR: 2,
  GBP: 2,
  GHS: 2,
  HKD: 2,
  HUF: 2,
  IDR: 2,
  ILS: 2,
  INR: 2,
  IQD: 3,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KES: 2,
  KRW: 0,
  KWD: 3,
  LKR: 2,
  MAD: 2,
  MXN: 2,
  MYR: 2,
  NGN: 2,
  NOK: 2,
  NZD: 2,
  OMR: 3,
  PEN: 2,
  PHP: 2,
  PKR: 2,
  PLN: 2,
  QAR: 2,
  RON: 2,
  RSD: 2,
  RUB: 2,
  SAR: 2,
  SEK: 2,
  SGD: 2,
  THB: 2,
  TND: 3,
  TRY: 2,
  TWD: 2,
  TZS: 2,
  UAH: 2,
  USD: 2,
  UYU: 2,
  VND: 0,
  XAF: 0,
  XOF: 0,
  ZAR: 2,
});

// ---- Display FX providers ----
//
// Base URLs are CONSTANTS, not configuration and not admin-editable. An FX
// endpoint sourced from a request or a database row is an SSRF primitive: the
// server would fetch whatever host an attacker could persuade it to store.
// Swapping a provider is a code change and a review, by design.

// Primary. Public, free, no API key, open source, central-bank sourced.
export const DISPLAY_FX_PRIMARY_BASE_URL = 'https://api.frankfurter.dev/v1';

// Fallback. Public, free, no API key, 200+ currencies, updated daily. The two
// URLs are transport mirrors of ONE economic source, not two providers — a
// disagreement between them is a CDN problem, not a second opinion on the rate.
export const DISPLAY_FX_FALLBACK_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
export const DISPLAY_FX_FALLBACK_MIRROR_URL = 'https://latest.currency-api.pages.dev/v1';

// Country lookup for anonymous visitors. Country-only, no API key, no quota
// billing. Called with a server-derived IP and nothing else.
export const GEO_COUNTRY_LOOKUP_URL = 'https://api.country.is';

// ---- Display FX budget ----
//
// Display FX is a presentation enhancement. It must never be able to add
// seconds to a page: each provider gets a short slice and the page renders USD
// rather than waiting.
export const DISPLAY_FX_PROVIDER_TIMEOUT_MS = 1_500;
export const GEO_LOOKUP_TIMEOUT_MS = 1_000;

// Upstream publishes roughly daily, so a longer cache costs nothing in accuracy
// and removes the provider from the hot path of almost every request.
export const DISPLAY_FX_CACHE_TTL_MS = 30 * 60 * 1_000;

// An unsupported pair is cached briefly too. Without it, every render of a page
// in an unquotable currency re-asks both providers for an answer that will not
// change today.
export const DISPLAY_FX_NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1_000;

// Country → IP is stable for far longer than a page view, and the key is a hash
// so no raw address is ever written down.
export const GEO_COUNTRY_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;

// ---- Rate sanity ----
//
// A rate outside this band is a broken upstream, not a currency. The bounds are
// deliberately enormous — hyperinflation is real and a narrow percentage cap
// would reject a genuine devaluation exactly when the display matters most.
export const DISPLAY_FX_MIN_RATE_SCALED = 1;
export const DISPLAY_FX_MAX_RATE_SCALED = 1_000_000_000 * FX_RATE_SCALE;

// A display rate older than this is stale enough to be worth a metric, though
// never worth blanking a price over: an old rate beats no price.
export const DISPLAY_FX_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1_000;

// ---- Anonymous preference cookie ----
export const DISPLAY_CURRENCY_COOKIE_NAME = 'claw_display_currency';
export const DISPLAY_CURRENCY_COOKIE_MAX_AGE_S = 180 * 24 * 60 * 60;
// Bounded so a cookie can never become a payload. "AUTO" or a 3-letter code.
export const DISPLAY_CURRENCY_COOKIE_MAX_LENGTH = 8;

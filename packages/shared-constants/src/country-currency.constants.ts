import { DISPLAY_BASE_CURRENCY } from './display-currency.constants';

// ---- ISO-3166-1 alpha-2 country → ISO-4217 currency ----
//
// ONE map. A geolocation provider's own `currency` field is not used: a geo API
// is an authority on where an address is, not on what ClawAI prices in, and
// letting upstream decide would make a currency change arrive unannounced.
//
// This map answers exactly one question — "in AUTO mode, what should this
// visitor see?" — and only for countries whose currency ClawAI can display. A
// country whose currency is not in SUPPORTED_DISPLAY_CURRENCIES is deliberately
// absent and resolves to USD, which is the honest answer.
//
// Country is context, never financial truth. A user who picks a currency keeps
// it regardless of where they are sitting.
export const COUNTRY_TO_DISPLAY_CURRENCY: Readonly<Record<string, string>> = Object.freeze({
  // Eurozone — one currency, twenty countries. Listed individually rather than
  // derived, so a country joining or leaving is a one-line reviewed change.
  AD: 'EUR',
  AT: 'EUR',
  BE: 'EUR',
  CY: 'EUR',
  DE: 'EUR',
  EE: 'EUR',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GR: 'EUR',
  HR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MC: 'EUR',
  ME: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
  SM: 'EUR',
  VA: 'EUR',
  XK: 'EUR',

  // Rest of Europe
  BG: 'BGN',
  CH: 'CHF',
  CZ: 'CZK',
  DK: 'DKK',
  GB: 'GBP',
  HU: 'HUF',
  IS: 'ISK',
  LI: 'CHF',
  NO: 'NOK',
  PL: 'PLN',
  RO: 'RON',
  RS: 'RSD',
  RU: 'RUB',
  SE: 'SEK',
  UA: 'UAH',
  // British Crown dependencies and territories that use sterling at par.
  GG: 'GBP',
  IM: 'GBP',
  JE: 'GBP',
  GI: 'GBP',

  // Middle East and North Africa
  AE: 'AED',
  BH: 'BHD',
  DZ: 'DZD',
  EG: 'EGP',
  IQ: 'IQD',
  IL: 'ILS',
  JO: 'JOD',
  KW: 'KWD',
  MA: 'MAD',
  OM: 'OMR',
  PS: 'ILS',
  QA: 'QAR',
  SA: 'SAR',
  TN: 'TND',
  TR: 'TRY',

  // Sub-Saharan Africa. XAF and XOF are shared by entire monetary unions, which
  // is exactly why a country → currency map beats a country → country guess.
  BF: 'XOF',
  BJ: 'XOF',
  CI: 'XOF',
  CF: 'XAF',
  CG: 'XAF',
  CM: 'XAF',
  GA: 'XAF',
  GH: 'GHS',
  GQ: 'XAF',
  GW: 'XOF',
  KE: 'KES',
  ML: 'XOF',
  NE: 'XOF',
  NG: 'NGN',
  SN: 'XOF',
  TD: 'XAF',
  TG: 'XOF',
  TZ: 'TZS',
  ZA: 'ZAR',

  // Asia-Pacific
  AU: 'AUD',
  BD: 'BDT',
  CN: 'CNY',
  HK: 'HKD',
  ID: 'IDR',
  IN: 'INR',
  JP: 'JPY',
  KR: 'KRW',
  LK: 'LKR',
  MY: 'MYR',
  NZ: 'NZD',
  PH: 'PHP',
  PK: 'PKR',
  SG: 'SGD',
  TH: 'THB',
  TW: 'TWD',
  VN: 'VND',

  // Americas
  AR: 'ARS',
  BR: 'BRL',
  CA: 'CAD',
  CL: 'CLP',
  CO: 'COP',
  MX: 'MXN',
  PE: 'PEN',
  US: 'USD',
  UY: 'UYU',
  // Dollarized economies. Their legal tender IS the US dollar, so USD here is
  // the correct local answer, not a fallback.
  EC: 'USD',
  PA: 'USD',
  SV: 'USD',
  TL: 'USD',
  ZW: 'USD',
});

// Cloudflare reports these instead of a country: XX when it cannot resolve one,
// T1 for Tor exit nodes. Both mean "unknown", and treating either as a country
// code would send a visitor to a currency named after nothing.
export const UNRESOLVED_COUNTRY_CODES: readonly string[] = Object.freeze(['XX', 'T1', 'AP', 'EU']);

// Unknown country resolves to the canonical currency. Guessing is worse than
// showing the price ClawAI actually charges.
export function resolveCountryDisplayCurrency(countryCode: string | null): string {
  if (countryCode === null) {
    return DISPLAY_BASE_CURRENCY;
  }
  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized) || UNRESOLVED_COUNTRY_CODES.includes(normalized)) {
    return DISPLAY_BASE_CURRENCY;
  }
  return COUNTRY_TO_DISPLAY_CURRENCY[normalized] ?? DISPLAY_BASE_CURRENCY;
}

export function isValidCountryCode(countryCode: string): boolean {
  const normalized = countryCode.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) && !UNRESOLVED_COUNTRY_CODES.includes(normalized);
}

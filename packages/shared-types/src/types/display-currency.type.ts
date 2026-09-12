import { type CurrencyPreferenceMode } from '../enums/currency-preference-mode.enum';
import { type DisplayFxSource } from '../enums/display-fx-source.enum';
import { type DisplayRoundingPolicy } from '../enums/display-rounding-policy.enum';
import { type GeoCountrySource } from '../enums/geo-country-source.enum';

// A display-only exchange rate.
//
// Deliberately NOT shaped like FxQuoteSnapshot. There is no quoteId, no
// expiresAt and no safetyMarginBps, so this object cannot be handed to anything
// that settles money — the compiler refuses before a reviewer has to notice.
export type DisplayFxRate = {
  baseCurrency: string;
  quoteCurrency: string;
  // Scaled by FX_RATE_SCALE. Never a float.
  rateScaled: number;
  // The date the upstream itself published, not the moment ClawAI fetched it.
  // Upstream updates roughly daily; claiming otherwise in the UI would be a
  // claim about market data ClawAI does not have.
  asOf: string | null;
  source: DisplayFxSource;
};

// One canonical amount, rendered once.
//
// The canonical figure travels WITH the converted one so no surface has to
// decide what "the real price" was, and so a conversion failure degrades to
// showing the canonical amount rather than showing nothing.
export type LocalizedMoneyView = {
  canonicalAmountMinor: number;
  canonicalCurrency: string;

  displayAmountMinor: number;
  displayCurrency: string;

  // True whenever an FX rate was applied. Drives the "≈" and the wording:
  // an estimate must never be presented with the authority of a charge.
  approximate: boolean;
  // False means displayAmountMinor IS the canonical amount, because conversion
  // was unavailable. The price still renders; only the localization is lost.
  conversionAvailable: boolean;

  fxAsOf: string | null;
  fxSource: DisplayFxSource;
  roundingPolicy: DisplayRoundingPolicy;
  roundingPolicyVersion: number;
};

// Everything a page needs to localize every amount on it, resolved once.
//
// A page fetches this once and converts every amount locally. The alternative —
// each plan card asking for its own rate — is seven upstream calls for one
// page and seven chances to disagree with each other.
export type DisplayCurrencyContext = {
  countryCode: string | null;
  currencyCode: string;
  mode: CurrencyPreferenceMode;
  countrySource: GeoCountrySource;
  // Null when the currency is USD (nothing to convert) or when both providers
  // failed. Either way the caller renders canonical amounts.
  fx: DisplayFxRate | null;
};

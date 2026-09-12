import { type DisplayFxSource } from '@claw/shared-types';

// What an adapter returns. Deliberately minimal: a caller must not be able to
// tell Frankfurter from the fallback by the shape of the answer, or provider
// detail would leak into business code and a swap would become a rewrite.
export type DisplayRateResult = {
  rateScaled: number;
  // The date the upstream published. Null when it does not say.
  asOf: string | null;
  source: DisplayFxSource;
};

// One provider of display rates.
//
// Returns null for "I cannot answer" — an unsupported currency, a timeout, a
// malformed body. Null is an ordinary outcome here, which is why it is not an
// exception: the caller's next move is the fallback, not an error page.
export type DisplayFxProvider = {
  readonly name: DisplayFxSource;
  fetchRate(baseCurrency: string, quoteCurrency: string): Promise<DisplayRateResult | null>;
};

export type ResolvedCountry = {
  countryCode: string | null;
  source: string;
};

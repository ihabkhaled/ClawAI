// A quote is bound to a checkout session and revalidated against the amount the
// provider reports, so the charged total can never silently drift from the one
// the user was shown.
export type FxQuoteResult = {
  quoteId: string;
  baseCurrency: string;
  quoteCurrency: string;
  // Scaled integers (FX_RATE_SCALE). Never floats.
  sourceRateScaled: number;
  finalRateScaled: number;
  safetyMarginBps: number;
  // The exact total the gateway will be asked to charge.
  convertedAmountMinor: number;
  expiresAtMs: number;
  source: string;
};

export type FxRateSource = 'API' | 'CACHE' | 'FALLBACK';

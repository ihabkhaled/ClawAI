// Money is ALWAYS an integer count of the currency's minor unit
// ($5.00 USD -> { amountMinor: 500, currency: 'USD' }). Floating point is banned
// in every billing path: 0.1 + 0.2 !== 0.3 is a billing bug, not a curiosity.
export type Money = {
  amountMinor: number;
  currency: string;
};

// Provider cost is accounted in integer micro-USD (1 USD = 1_000_000 microUsd)
// so per-token prices far below one cent stay exact under integer arithmetic.
export type MicroUsd = {
  microUsd: number;
};

// A rate captured at a point in time, used to convert the canonical USD plan
// price into the currency a gateway will actually charge. Stored on the checkout
// session so the charged amount can be revalidated after the fact.
export type FxQuoteSnapshot = {
  baseCurrency: string;
  quoteCurrency: string;
  // Raw upstream rate, scaled by FX_RATE_SCALE to stay integral.
  sourceRateScaled: number;
  // Operator-configured protection against adverse movement, in basis points.
  safetyMarginBps: number;
  // sourceRateScaled adjusted by safetyMarginBps; the rate actually applied.
  finalRateScaled: number;
  source: string;
  fetchedAt: string;
  expiresAt: string;
  // The exact converted total bound to this quote.
  quotedAmountMinor: number;
};

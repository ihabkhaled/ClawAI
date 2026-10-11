/** Micro-USD in one USD. */
export const MICRO_USD_PER_USD = 1_000_000n;

/** USD per token -> micro-USD per million tokens multiplies by 10^12. */
export const PRICE_PER_TOKEN_TO_MICRO_PER_MTOK_EXPONENT = 12;

/** Above $1000 per million tokens a published price is treated as garbage. */
export const MAX_PRICE_MICRO_USD_PER_MTOK = 1_000_000_000n;

/** Guards BigInt blow-up from absurd exponents. */
export const MAX_PRICE_EXPONENT_MAGNITUDE = 60;

/** Decimal digits kept by the ConnectorModel price columns (Decimal(12,6)). */
export const PRICE_COLUMN_FRACTION_DIGITS = 6;

export const PRICE_DECIMAL_PATTERN = /^(\d{1,30})(?:\.(\d{1,30}))?(?:[eE]([+-]?\d{1,3}))?$/u;

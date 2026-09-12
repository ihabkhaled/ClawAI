// Where a display rate came from. Recorded for observability, never shown to an
// ordinary user — which upstream answered is ClawAI's operational concern.
export enum DisplayFxSource {
  FRANKFURTER = 'FRANKFURTER',
  FAWAZ_EXCHANGE_API = 'FAWAZ_EXCHANGE_API',
  CACHE = 'CACHE',
  // Base equals quote: no conversion happened and none was needed.
  IDENTITY = 'IDENTITY',
  // Nothing could quote. The price renders in canonical USD.
  USD_FALLBACK = 'USD_FALLBACK',
}

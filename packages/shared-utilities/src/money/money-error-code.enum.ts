// Why a money operation was rejected. These are programming-error codes: they
// signal a caller passed something a billing path must never accept, not a
// user-facing condition.
export enum MoneyErrorCode {
  NON_INTEGER_AMOUNT = 'NON_INTEGER_AMOUNT',
  NEGATIVE_AMOUNT = 'NEGATIVE_AMOUNT',
  AMOUNT_OVERFLOW = 'AMOUNT_OVERFLOW',
  UNSUPPORTED_CURRENCY = 'UNSUPPORTED_CURRENCY',
  CURRENCY_MISMATCH = 'CURRENCY_MISMATCH',
  INVALID_DECIMAL_STRING = 'INVALID_DECIMAL_STRING',
  EXCESSIVE_PRECISION = 'EXCESSIVE_PRECISION',
  INVALID_SCALE = 'INVALID_SCALE',
  INVALID_PERIOD = 'INVALID_PERIOD',
}

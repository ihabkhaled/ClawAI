// A proration quote is a short-lived, signed price promise. It expires so a
// user cannot hold a stale favourable amount open across a price change.
export enum ProrationQuoteStatus {
  ACTIVE = 'ACTIVE',
  CONSUMED = 'CONSUMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

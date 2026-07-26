/**
 * Expiry of a saved card, as far as the gateway told us.
 *
 * Both fields are nullable because Paymob does not always send them, and a
 * guessed expiry would produce a "your card is about to expire" warning at the
 * wrong time — worse than showing none.
 */
export type CardExpiry = {
  month: number | null;
  year: number | null;
};

/**
 * A reversal a gateway has told us about and we have verified.
 *
 * `amountMinor` is a positive magnitude — the sign is applied when the
 * compensating row is written, so no caller has to remember which direction a
 * credit goes in.
 */
export type ReversalRequest = {
  /** The captured charge row this refund reverses, resolved from our records. */
  originalTransactionId: string;
  subscriptionId: string;
  userId: string;
  gateway: string;
  amountMinor: number;
  currency: string;
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  /** The gateway's id for the refund/reversal itself, not the original capture. */
  providerTransactionId: string | null;
  /** The invoice to mark refunded, when identifiable. */
  invoiceId: string | null;
  correlationId: string;
};

/** What a reversal payload gives us before we resolve it to a subscription. */
export type ReversalSubject = {
  /** Gateway id of the capture being reversed. */
  captureId: string | null;
  /** Gateway id of the reversal event itself. */
  reversalId: string | null;
  amountMinor: number | null;
  currency: string | null;
};

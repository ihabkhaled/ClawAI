/**
 * A verified card-token callback, reduced to what may be stored.
 *
 * There is deliberately no field a PAN, CVV, expiry-with-PAN, or raw provider
 * body could occupy. `last4` is the maximum card fragment the type can express,
 * so a future caller cannot pass more even by accident.
 */
export type VaultCardInput = {
  userId: string;
  gateway: string;
  /** The gateway's own reusable token. Encrypted before it is stored. */
  gatewayToken: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  makeDefault: boolean;
  /**
   * When the user explicitly agreed to store this method.
   *
   * `null` is a refusal, not a default: vaulting a reusable payment credential
   * without recorded consent is the thing this field exists to prevent.
   */
  consentedAt: Date | null;
};

/** Outcome of a vault attempt. */
export type VaultedMethod = {
  paymentMethodId: string;
  active: boolean;
  /** True when the card was already saved and no second row was created. */
  alreadyExisted: boolean;
};

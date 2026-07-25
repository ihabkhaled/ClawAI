// Lifecycle of a server-priced checkout attempt. A session is the only object
// that may carry an amount into a gateway; it is immutable once created.
export enum CheckoutSessionStatus {
  CREATED = 'CREATED',
  // Provider order/intention created, awaiting the user.
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  // Provider reported success; ClawAI has verified amount, currency and binding.
  VERIFIED = 'VERIFIED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

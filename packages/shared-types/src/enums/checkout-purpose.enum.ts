// Why a checkout session exists. Determines which post-verification handler
// runs and whether a Subscription is created, revised, or left untouched.
export enum CheckoutPurpose {
  NEW_SUBSCRIPTION = 'NEW_SUBSCRIPTION',
  UPGRADE = 'UPGRADE',
  RENEWAL = 'RENEWAL',
  // Zero/low-value authorization used purely to vault a payment method.
  PAYMENT_METHOD_SETUP = 'PAYMENT_METHOD_SETUP',
  // One-off purchase of PAYG connector credit. The third purpose CLASS, not
  // merely the fifth member: it carries no plan fields (like PAYMENT_METHOD_SETUP)
  // but does carry a real amount (like a subscription), so it satisfies neither
  // branch of the existing checkout_sessions_purpose_fields_check. ADR-083
  // amends ADR-066 with the third branch. Adding this member WITHOUT the
  // migration makes every top-up insert fail at the database.
  CREDIT_TOPUP = 'CREDIT_TOPUP',
}

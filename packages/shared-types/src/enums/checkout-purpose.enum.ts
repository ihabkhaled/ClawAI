// Why a checkout session exists. Determines which post-verification handler
// runs and whether a Subscription is created, revised, or left untouched.
export enum CheckoutPurpose {
  NEW_SUBSCRIPTION = 'NEW_SUBSCRIPTION',
  UPGRADE = 'UPGRADE',
  RENEWAL = 'RENEWAL',
  // Zero/low-value authorization used purely to vault a payment method.
  PAYMENT_METHOD_SETUP = 'PAYMENT_METHOD_SETUP',
}

import type { CheckoutSession } from '../../../generated/prisma';

export type SubscriptionCheckoutField =
  | 'planId'
  | 'planSlug'
  | 'planPriceVersionId'
  | 'billingInterval'
  | 'baseAmountMinor'
  | 'baseCurrency'
  | 'chargeAmountMinor'
  | 'chargeCurrency';

export type SubscriptionCheckoutSession = CheckoutSession & {
  [Field in SubscriptionCheckoutField]-?: NonNullable<CheckoutSession[Field]>;
};

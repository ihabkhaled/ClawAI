import { type CheckoutSession, CheckoutSessionPurpose } from '../../../generated/prisma';
import { type SubscriptionCheckoutSession } from '../types/checkout-session-purpose.types';

export type { SubscriptionCheckoutSession } from '../types/checkout-session-purpose.types';

export function isSubscriptionCheckoutSession(
  session: CheckoutSession,
): session is SubscriptionCheckoutSession {
  return (
    session.purpose !== CheckoutSessionPurpose.PAYMENT_METHOD_SETUP &&
    session.planId !== null &&
    session.planSlug !== null &&
    session.planPriceVersionId !== null &&
    session.billingInterval !== null &&
    session.baseAmountMinor !== null &&
    session.baseCurrency !== null &&
    session.chargeAmountMinor !== null &&
    session.chargeCurrency !== null
  );
}

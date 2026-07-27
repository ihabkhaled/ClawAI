import { type CheckoutSessionView } from '../types/checkout.types';
import { type SubscriptionCheckoutSession } from '../../billing/utilities/checkout-session-purpose.utility';

/**
 * Projects a checkout session onto what the browser may see.
 *
 * An explicit field list, not a spread. A spread would publish `stateNonce` —
 * the value that proves a return-page callback is genuine — along with the
 * frozen FX rate and the price version id. None of those belong in a client
 * response, and a future column added to the model must not leak by default.
 */
export function toCheckoutSessionView(session: SubscriptionCheckoutSession): CheckoutSessionView {
  return {
    id: session.id,
    status: session.status,
    gateway: session.gateway,
    chargeAmountMinor: session.chargeAmountMinor,
    chargeCurrency: session.chargeCurrency,
    hostedCheckoutUrl: session.hostedCheckoutUrl,
    expiresAt: session.expiresAt.toISOString(),
  };
}

import { type CheckoutSessionView } from '../types/checkout.types';
import { type CreditTopupSessionView } from '../types/credit-topup.types';
import {
  type CreditTopupCheckoutSession,
  type PayableCheckoutSession,
} from '../../billing/utilities/checkout-session-purpose.utility';

/**
 * Projects a checkout session onto what the browser may see.
 *
 * Takes any PAYABLE session, not only a subscription: the projected fields are
 * the money and the gateway state, which a credit top-up has too. The view
 * carries no plan fields, so widening it cannot leak one purpose's shape into
 * another's response.
 *
 * An explicit field list, not a spread. A spread would publish `stateNonce` —
 * the value that proves a return-page callback is genuine — along with the
 * frozen FX rate and the price version id. None of those belong in a client
 * response, and a future column added to the model must not leak by default.
 */
export function toCheckoutSessionView(session: PayableCheckoutSession): CheckoutSessionView {
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

/**
 * Projects a credit top-up session onto what the browser may see.
 *
 * The same explicit field list as above, plus the credit figure — "what am I
 * buying" is the one thing a top-up confirmation must show. `creditPackageId`
 * and `creditPackageVersionId` stay server-side: the client has no use for
 * either, and the version id is what pins the price.
 *
 * `creditMicroUsd` is narrowed from BigInt to `number` here and nowhere else.
 * JSON has no BigInt and `JSON.stringify` throws on one, so a response that
 * carried the raw column would 500 the first time it was returned.
 */
export function toCreditTopupSessionView(
  session: CreditTopupCheckoutSession,
): CreditTopupSessionView {
  return {
    id: session.id,
    status: session.status,
    gateway: session.gateway,
    chargeAmountMinor: session.chargeAmountMinor,
    chargeCurrency: session.chargeCurrency,
    creditMicroUsd: Number(session.creditMicroUsd),
    hostedCheckoutUrl: session.hostedCheckoutUrl,
    expiresAt: session.expiresAt.toISOString(),
  };
}

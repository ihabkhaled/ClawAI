import { type CheckoutSession, CheckoutSessionPurpose } from '../../../generated/prisma';
import {
  type CreditTopupCheckoutSession,
  type PayableCheckoutSession,
  type SubscriptionCheckoutSession,
} from '../types/checkout-session-purpose.types';

export type {
  CreditTopupCheckoutSession,
  PayableCheckoutSession,
  SubscriptionCheckoutSession,
} from '../types/checkout-session-purpose.types';

/**
 * True for a session that represents money changing hands for something —
 * a subscription or a credit top-up — and false for a card-vaulting setup.
 *
 * A setup session also carries an amount, so the purpose check is load-bearing
 * and is deliberately the first clause.
 */
export function isPayableCheckoutSession(
  session: CheckoutSession,
): session is PayableCheckoutSession {
  return (
    session.purpose !== CheckoutSessionPurpose.PAYMENT_METHOD_SETUP &&
    session.baseAmountMinor !== null &&
    session.baseCurrency !== null &&
    session.chargeAmountMinor !== null &&
    session.chargeCurrency !== null
  );
}

/**
 * True only for a session that buys a PLAN.
 *
 * Deliberately unchanged by the arrival of CREDIT_TOPUP: a top-up carries null
 * plan fields, so it already fails this predicate and every existing caller
 * keeps its exact behaviour. Widening this to admit top-ups would have let a
 * top-up reach `activateFromVerifiedPayment` and mint a subscription nobody
 * bought — the positive `isCreditTopupCheckoutSession` below is the correct
 * shape of that change.
 */
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

/**
 * True only for a session that buys PAYG credit.
 *
 * Positive rather than "not a subscription": a half-written row with a purpose
 * of CREDIT_TOPUP but no package binding must be refused, not treated as a
 * purchase of an unknown amount of credit. The database CHECK makes such a row
 * unstorable; this is the same assertion in the type system.
 */
export function isCreditTopupCheckoutSession(
  session: CheckoutSession,
): session is CreditTopupCheckoutSession {
  return (
    session.purpose === CheckoutSessionPurpose.CREDIT_TOPUP &&
    session.creditPackageId !== null &&
    session.creditPackageVersionId !== null &&
    session.creditMicroUsd !== null &&
    session.baseAmountMinor !== null &&
    session.baseCurrency !== null &&
    session.chargeAmountMinor !== null &&
    session.chargeCurrency !== null
  );
}

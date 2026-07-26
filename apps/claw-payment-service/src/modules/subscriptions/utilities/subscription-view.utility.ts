import {
  type CurrentSubscriptionView,
  type InvoiceView,
  type PaymentMethodView,
  type ProrationQuoteResponse,
} from '../types/subscription-view.types';
import { type ProrationQuoteView } from '../../billing/types/proration.types';
import { type Invoice, type PaymentMethod, type Subscription } from '../../../generated/prisma';

/**
 * Projects a subscription onto what the browser may see.
 *
 * Explicit field lists throughout, never a spread. A spread here would publish
 * `encryptedGatewaySubscriptionId`, `gatewaySubscriptionLookupHash` and the
 * optimistic-concurrency `version` — and would keep publishing every column
 * added to the model in future.
 *
 * `planName` falls back to the slug: the human name lives in auth-service, and
 * a billing page must still render when that call is not on the path.
 */
export function toCurrentSubscriptionView(
  subscription: Subscription,
  planName: string | null,
): CurrentSubscriptionView {
  return {
    id: subscription.id,
    planId: subscription.planId,
    planSlug: subscription.planSlug,
    planName: planName ?? subscription.planSlug,
    status: subscription.status,
    billingInterval: subscription.billingInterval,
    currency: subscription.currency,
    amountMinor: subscription.amountMinor,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toISOString() ?? null,
    scheduledPlanSlug: subscription.scheduledPlanSlug,
    scheduledEffectiveAt: subscription.scheduledEffectiveAt?.toISOString() ?? null,
  };
}

export function toInvoiceView(invoice: Invoice): InvoiceView {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    totalMinor: invoice.totalMinor,
    issuedAt: invoice.issuedAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    // Invoices are rendered by ClawAI, not hosted at a gateway. The field
    // exists so the frontend contract is stable if that ever changes.
    hostedInvoiceUrl: null,
  };
}

/**
 * Projects a vaulted payment method.
 *
 * `encryptedToken`, `tokenBlindIndex` and `encryptionKeyVersion` are all
 * absent by construction. The ciphertext leaving this service would defeat the
 * point of encrypting it at the application layer at all.
 */
export function toPaymentMethodView(method: PaymentMethod): PaymentMethodView {
  return {
    id: method.id,
    gateway: method.gateway,
    brand: method.brand,
    last4: method.last4,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    isDefault: method.isDefault,
  };
}

export function toProrationQuoteResponse(quote: ProrationQuoteView): ProrationQuoteResponse {
  return {
    quoteId: quote.quoteId,
    targetPlanSlug: quote.targetPlanSlug,
    currency: quote.currency,
    unusedCurrentCreditMinor: quote.unusedCurrentCreditMinor,
    targetRemainingChargeMinor: quote.targetRemainingChargeMinor,
    amountDueMinor: quote.amountDueMinor,
    isScheduledForPeriodEnd: quote.isScheduledForPeriodEnd,
    scheduledEffectiveAt:
      quote.scheduledEffectiveAtMs === null
        ? null
        : new Date(quote.scheduledEffectiveAtMs).toISOString(),
    expiresAt: new Date(quote.expiresAtMs).toISOString(),
  };
}

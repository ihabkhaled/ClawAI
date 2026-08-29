import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, CheckoutSessionStatus } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { SubscriptionLifecycleService } from '../../billing/services/subscription-lifecycle.service';
import {
  type ActivateSubscriptionInput,
  type ActivationResult,
} from '../../billing/types/subscription-lifecycle.types';
import {
  type CreditTopupCheckoutSession,
  isCreditTopupCheckoutSession,
  isSubscriptionCheckoutSession,
  type PayableCheckoutSession,
  type SubscriptionCheckoutSession,
} from '../../billing/utilities/checkout-session-purpose.utility';
import { CreditTopupLifecycleService } from '../../billing/services/credit-topup-lifecycle.service';
import { BillingCustomerRepository } from '../repositories/billing-customer.repository';
import { resolvePeriodEndMs } from '../utilities/billing-period.utility';
import { type VerifiedPayment } from '../types/verified-payment.types';
import { CheckoutSessionPurpose } from '../../../generated/prisma';

/**
 * The single door between "a gateway says money moved" and "this user has a
 * paid plan".
 *
 * Every gateway handler funnels through here, and every one of them must have
 * already verified the payment against the session's own recorded amount,
 * currency and binding. This service re-checks the session's state anyway:
 * defence in depth is cheap, and a second activation on a replayed webhook
 * would hand out a second subscription.
 */
@Injectable()
export class PaymentActivationService {
  private readonly logger = new Logger(PaymentActivationService.name);

  constructor(
    private readonly sessions: CheckoutSessionRepository,
    private readonly customers: BillingCustomerRepository,
    private readonly lifecycle: SubscriptionLifecycleService,
    private readonly creditTopups: CreditTopupLifecycleService,
  ) {}

  async activate(payment: VerifiedPayment): Promise<string | null> {
    this.logger.debug(`activate: session=${payment.checkoutSessionId}`);
    const session = await this.sessions.findById(payment.checkoutSessionId);
    if (session === null) {
      this.logger.error(`activate: unknown session=${payment.checkoutSessionId}`);
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }

    // Already completed. A gateway retrying a delivery it already sent must not
    // produce a second subscription, and this is the check that stops it even
    // if the webhook-event unique index were somehow bypassed.
    if (session.status === CheckoutSessionStatus.COMPLETED) {
      this.logger.warn(`activate: session=${session.id} already completed — ignoring replay`);
      return session.subscriptionId;
    }
    // A credit top-up is a real purchase with a real invoice and NO plan. It is
    // branched here, at the single door, rather than by loosening
    // `isSubscriptionCheckoutSession` — a widened predicate would have let a
    // top-up reach `activateFromVerifiedPayment` and mint a subscription
    // nobody bought.
    if (isCreditTopupCheckoutSession(session)) {
      await this.assertPaymentMatchesSession(session, payment);
      await this.activateCreditTopup(session, payment);
      return null;
    }
    if (!isSubscriptionCheckoutSession(session)) {
      this.logger.error(`activate: non-subscription session=${session.id}`);
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }

    await this.assertPaymentMatchesSession(session, payment);
    this.assertUpgradeBinding(session);
    const customer = await this.customers.ensureForUser(session.userId, session.gateway);
    const activation = await this.activateMatchedSession(session, payment, customer.id);

    this.logger.log(
      `activate: subscription=${activation.subscriptionId} invoice=${activation.invoiceNumber} ` +
        `from session=${session.id}`,
    );
    return activation.subscriptionId;
  }

  /**
   * Records the money and enqueues the grant, in one transaction.
   *
   * Returns no subscription id because there is no subscription: the caller's
   * `null` means "paid, and nothing about this user's plan changed", which is
   * exactly right for a wallet purchase.
   */
  private async activateCreditTopup(
    session: CreditTopupCheckoutSession,
    payment: VerifiedPayment,
  ): Promise<void> {
    const activation = await this.creditTopups.activateFromVerifiedPayment({
      paymentVerified: true,
      userId: session.userId,
      invoiceRecipientEmail: session.billingEmail,
      checkoutSessionId: session.id,
      gateway: session.gateway,
      packageId: session.creditPackageId,
      packageVersionId: session.creditPackageVersionId,
      // From the session, never from the gateway payload: the credit is what we
      // froze at checkout, not what a provider says it collected.
      creditMicroUsd: session.creditMicroUsd,
      baseAmountMinor: session.baseAmountMinor,
      baseCurrency: session.baseCurrency,
      providerAmountMinor: payment.amountMinor,
      providerCurrency: payment.currency,
      providerTransactionId: payment.providerTransactionId,
      providerOrderId: session.providerOrderId,
      correlationId: payment.correlationId,
    });
    this.logger.log(
      `activate: credit top-up transaction=${activation.paymentTransactionId} ` +
        `invoice=${activation.invoiceNumber} from session=${session.id}`,
    );
  }

  private assertUpgradeBinding(session: SubscriptionCheckoutSession): void {
    if (
      session.purpose !== CheckoutSessionPurpose.UPGRADE ||
      (session.subscriptionId !== null && session.prorationQuoteId !== null)
    ) {
      return;
    }
    this.logger.error(`assertUpgradeBinding: incomplete upgrade binding session=${session.id}`);
    throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
  }

  private async activateMatchedSession(
    session: SubscriptionCheckoutSession,
    payment: VerifiedPayment,
    billingCustomerId: string,
  ): Promise<ActivationResult> {
    const activationInput = this.buildActivationInput(session, payment, billingCustomerId);
    if (session.purpose !== CheckoutSessionPurpose.UPGRADE) {
      return this.lifecycle.activateFromVerifiedPayment(activationInput);
    }
    if (session.subscriptionId === null || session.prorationQuoteId === null) {
      this.logger.error(`activateMatchedSession: incomplete upgrade binding session=${session.id}`);
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }
    return this.lifecycle.activatePlanChangeFromVerifiedPayment({
      ...activationInput,
      existingSubscriptionId: session.subscriptionId,
      prorationQuoteId: session.prorationQuoteId,
    });
  }

  private buildActivationInput(
    session: SubscriptionCheckoutSession,
    payment: VerifiedPayment,
    billingCustomerId: string,
  ): ActivateSubscriptionInput {
    const periodStartMs = Date.now();
    const periodEndMs = resolvePeriodEndMs(periodStartMs, session.billingInterval);
    return {
      paymentVerified: true,
      userId: session.userId,
      invoiceRecipientEmail: session.billingEmail,
      billingCustomerId,
      checkoutSessionId: session.id,
      planId: session.planId,
      planSlug: session.planSlug,
      planPriceVersionId: session.planPriceVersionId,
      gateway: session.gateway,
      billingInterval: session.billingInterval,
      baseAmountMinor: session.baseAmountMinor,
      baseCurrency: session.baseCurrency,
      periodStartMs,
      periodEndMs,
      // Entitlement outlives the period by the grace window, so a renewal that
      // is a few hours late does not lock a paying customer out mid-sentence.
      entitlementValidUntilMs: periodEndMs + AppConfig.get().BILLING_GRACE_PERIOD_MS,
      encryptedGatewaySubscriptionId: null,
      gatewaySubscriptionLookupHash: null,
      correlationId: payment.correlationId,
      // Carried through so a later refund or chargeback naming this capture can be
      // paired with the charge it reverses.
      providerTransactionId: payment.providerTransactionId,
      providerOrderId: session.providerOrderId,
      providerAmountMinor: payment.amountMinor,
      providerCurrency: payment.currency,
    };
  }

  /**
   * The amount check, unchanged and deliberately un-weakened.
   *
   * Widened only to `PayableCheckoutSession` — the narrowest type that has an
   * amount — so both purchase kinds go through the SAME comparison. What a
   * provider reports must equal what we recorded intending to charge, or the
   * session is failed and nothing is activated.
   */
  private async assertPaymentMatchesSession(
    session: PayableCheckoutSession,
    payment: VerifiedPayment,
  ): Promise<void> {
    if (
      payment.amountMinor === session.chargeAmountMinor &&
      payment.currency === session.chargeCurrency
    ) {
      return;
    }
    this.logger.error(
      `activate: amount mismatch session=${session.id} ` +
        `expected=${String(session.chargeAmountMinor)}${session.chargeCurrency} ` +
        `reported=${String(payment.amountMinor)}${payment.currency}`,
    );
    await this.sessions.markFailed(session.id, BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
    throw new BillingException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
  }
}

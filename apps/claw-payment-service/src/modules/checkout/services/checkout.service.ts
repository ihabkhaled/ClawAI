import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  BillingErrorCode,
  BillingGateway,
  CheckoutPurpose,
  CheckoutSessionStatus,
} from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import { CHECKOUT_SESSION_TTL_MS } from '../../billing/constants/billing.constants';
import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import {
  isSubscriptionCheckoutSession,
  type SubscriptionCheckoutSession,
} from '../../billing/utilities/checkout-session-purpose.utility';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import {
  CHECKOUT_CANCEL_PATH,
  CHECKOUT_DESCRIPTION_PREFIX,
  CHECKOUT_RETURN_PATH,
  CHECKOUT_STATE_NONCE_BYTES,
} from '../constants/checkout.constants';
import {
  type CheckoutSessionView,
  type GatewayOrderContext,
  type StartCheckoutInput,
  type StartPlanChangeCheckoutInput,
} from '../types/checkout.types';
import { toCheckoutSessionView } from '../utilities/checkout-view.utility';
import { ChargeResolverService } from './charge-resolver.service';

/**
 * Creates a server-priced checkout session and hands it to a gateway.
 *
 * Order of operations matters and is not negotiable: the session row — carrying
 * the amount we intend to charge — is committed BEFORE the gateway is called.
 * If the provider call then fails, we still have a record of what was intended,
 * so a payment that succeeds on the provider side despite a lost response can
 * be reconciled instead of becoming money with no matching order.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly sessions: CheckoutSessionRepository,
    private readonly charges: ChargeResolverService,
    private readonly paypal: PaypalAdapter,
    private readonly paymob: PaymobAdapter,
  ) {}

  async start(input: StartCheckoutInput): Promise<CheckoutSessionView> {
    this.logger.debug(`start: user=${input.userId} plan=${input.planId}`);

    // A replayed request returns the ORIGINAL session. Creating a second
    // payable order for one intent is how a customer gets charged twice.
    const existing = await this.sessions.findByIdempotencyKey(input.userId, input.idempotencyKey);
    if (existing !== null) {
      if (!isSubscriptionCheckoutSession(existing)) {
        throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
      }
      this.logger.log(`start: replaying existing session=${existing.id}`);
      return toCheckoutSessionView(existing);
    }

    const charge = await this.charges.resolve(input.planId, input.billingInterval, input.gateway);
    const session = await this.createSession(input, charge);

    try {
      return await this.attachGatewayOrder(session, input);
    } catch (error: unknown) {
      // The session stays on record as FAILED with a stable code. Never the
      // provider's error body — it can carry payer details.
      await this.sessions.markFailed(session.id, BillingErrorCode.GATEWAY_UNAVAILABLE);
      this.logger.error(
        `start: gateway order failed session=${session.id} code=${BillingErrorCode.GATEWAY_UNAVAILABLE}`,
      );
      throw error;
    }
  }

  /**
   * Opens a checkout for an upgrade the user has already been quoted.
   *
   * The amount comes from the consumed proration quote, not from the target
   * plan's full price: the customer agreed to a specific prorated figure and
   * that is the only number we may charge. Everything else — the FX conversion
   * for a non-USD gateway, committing before calling the provider, recording a
   * stable failure code — follows the same path as a new subscription.
   */
  async startPlanChange(input: StartPlanChangeCheckoutInput): Promise<CheckoutSessionView> {
    this.logger.debug(`startPlanChange: user=${input.userId} quote=${input.prorationQuoteId}`);

    const existing = await this.sessions.findByIdempotencyKey(input.userId, input.idempotencyKey);
    if (existing !== null) {
      if (!isSubscriptionCheckoutSession(existing)) {
        throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
      }
      this.logger.log(`startPlanChange: replaying existing session=${existing.id}`);
      return toCheckoutSessionView(existing);
    }

    const charge = await this.charges.convertQuotedAmount(
      input.amountDueMinor,
      input.currency,
      input.gateway,
      input.targetPriceVersionId,
    );
    const session = await this.sessions.create({
      userId: input.userId,
      purpose: CheckoutPurpose.UPGRADE,
      status: CheckoutSessionStatus.CREATED,
      gateway: input.gateway,
      planId: input.targetPlanId,
      planSlug: input.targetPlanSlug,
      planPriceVersionId: input.targetPriceVersionId,
      billingInterval: input.billingInterval,
      baseAmountMinor: charge.baseAmountMinor,
      baseCurrency: charge.baseCurrency,
      chargeAmountMinor: charge.chargeAmountMinor,
      chargeCurrency: charge.chargeCurrency,
      fxQuoteId: charge.fxQuoteId,
      fxFinalRateScaled: charge.fxFinalRateScaled,
      prorationQuoteId: input.prorationQuoteId,
      subscription: { connect: { id: input.subscriptionId } },
      idempotencyKey: input.idempotencyKey,
      stateNonce: randomBytes(CHECKOUT_STATE_NONCE_BYTES).toString('hex'),
      expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS),
    });
    if (!isSubscriptionCheckoutSession(session)) {
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }

    try {
      return await this.attachGatewayOrder(session, {
        gateway: input.gateway,
        userEmail: input.userEmail,
      });
    } catch (error: unknown) {
      await this.sessions.markFailed(session.id, BillingErrorCode.GATEWAY_UNAVAILABLE);
      this.logger.error(
        `startPlanChange: gateway order failed session=${session.id} code=${BillingErrorCode.GATEWAY_UNAVAILABLE}`,
      );
      throw error;
    }
  }

  async findOwned(userId: string, sessionId: string): Promise<CheckoutSessionView> {
    this.logger.debug(`findOwned: user=${userId} session=${sessionId}`);
    const session = await this.sessions.findById(sessionId);
    // Ownership is checked here, in the service, and a foreign session is
    // reported as NOT FOUND rather than FORBIDDEN so the endpoint cannot be
    // used to probe which session ids exist.
    if (session?.userId !== userId) {
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }
    if (!isSubscriptionCheckoutSession(session)) {
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }
    return toCheckoutSessionView(session);
  }

  private async createSession(
    input: StartCheckoutInput,
    charge: Awaited<ReturnType<ChargeResolverService['resolve']>>,
  ): Promise<SubscriptionCheckoutSession> {
    const session = await this.sessions.create({
      userId: input.userId,
      purpose: CheckoutPurpose.NEW_SUBSCRIPTION,
      status: CheckoutSessionStatus.CREATED,
      gateway: input.gateway,
      planId: input.planId,
      planSlug: input.planId,
      planPriceVersionId: charge.planPriceVersionId,
      billingInterval: input.billingInterval,
      baseAmountMinor: charge.baseAmountMinor,
      baseCurrency: charge.baseCurrency,
      chargeAmountMinor: charge.chargeAmountMinor,
      chargeCurrency: charge.chargeCurrency,
      fxQuoteId: charge.fxQuoteId,
      fxFinalRateScaled: charge.fxFinalRateScaled,
      idempotencyKey: input.idempotencyKey,
      stateNonce: randomBytes(CHECKOUT_STATE_NONCE_BYTES).toString('hex'),
      expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS),
    });
    if (!isSubscriptionCheckoutSession(session)) {
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }
    return session;
  }

  private async attachGatewayOrder(
    session: SubscriptionCheckoutSession,
    input: GatewayOrderContext,
  ): Promise<CheckoutSessionView> {
    const order =
      input.gateway === BillingGateway.PAYPAL
        ? await this.createPaypalOrder(session)
        : await this.createPaymobIntention(session, input.userEmail);

    await this.sessions.attachProviderOrder(session.id, order.providerOrderId, order.hostedUrl);
    this.logger.log(`start: session=${session.id} gateway=${input.gateway} order created`);

    return toCheckoutSessionView({
      ...session,
      status: CheckoutSessionStatus.AWAITING_PAYMENT,
      providerOrderId: order.providerOrderId,
      hostedCheckoutUrl: order.hostedUrl,
    });
  }

  private async createPaypalOrder(
    session: SubscriptionCheckoutSession,
  ): Promise<{ providerOrderId: string; hostedUrl: string | null }> {
    const result = await this.paypal.createOrder({
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
      idempotencyKey: session.idempotencyKey,
      returnUrl: CheckoutService.buildReturnUrl(session, CHECKOUT_RETURN_PATH),
      cancelUrl: CheckoutService.buildReturnUrl(session, CHECKOUT_CANCEL_PATH),
      description: `${CHECKOUT_DESCRIPTION_PREFIX} — ${session.billingInterval.toLowerCase()}`,
    });
    return { providerOrderId: result.orderId, hostedUrl: result.approvalUrl };
  }

  private async createPaymobIntention(
    session: SubscriptionCheckoutSession,
    billingEmail: string,
  ): Promise<{ providerOrderId: string; hostedUrl: string | null }> {
    const result = await this.paymob.createIntention({
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
      idempotencyKey: session.idempotencyKey,
      billingEmail,
      description: `${CHECKOUT_DESCRIPTION_PREFIX} — ${session.billingInterval.toLowerCase()}`,
    });
    return {
      providerOrderId: result.intentionId,
      hostedUrl: CheckoutService.buildPaymobCheckoutUrl(result.clientSecret),
    };
  }

  // Built from configuration plus our own session id and nonce. A redirect
  // target supplied by the caller would let an attacker land a paying customer
  // on a page they control.
  private static buildReturnUrl(session: SubscriptionCheckoutSession, path: string): string {
    const base = AppConfig.get().FRONTEND_URL.replace(/\/+$/, '');
    const query = new URLSearchParams({ session: session.id, state: session.stateNonce });
    return `${base}${path}?${query.toString()}`;
  }

  private static buildPaymobCheckoutUrl(clientSecret: string): string {
    const publicKey = AppConfig.get().PAYMOB_PUBLIC_KEY;
    if (publicKey === undefined) {
      throw new BillingException(BillingErrorCode.GATEWAY_NOT_CONFIGURED);
    }
    return `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${clientSecret}`;
  }
}

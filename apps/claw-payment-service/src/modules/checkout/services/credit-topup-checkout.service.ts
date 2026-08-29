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
  type CreditTopupCheckoutSession,
  isCreditTopupCheckoutSession,
} from '../../billing/utilities/checkout-session-purpose.utility';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { GatewayRuntimeConfigService } from '../../gateway-config/services/gateway-runtime-config.service';
import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import { type CreditPackageVersionView } from '../../plan-catalog/types/plan-catalog.types';
import {
  CHECKOUT_STATE_NONCE_BYTES,
  CREDIT_TOPUP_CANCEL_PATH,
  CREDIT_TOPUP_DESCRIPTION_PREFIX,
  CREDIT_TOPUP_RETURN_PATH,
} from '../constants/checkout.constants';
import {
  type CreditTopupSessionView,
  type ResolvedCreditCharge,
  type StartCreditTopupInput,
} from '../types/credit-topup.types';
import { toCreditTopupSessionView } from '../utilities/checkout-view.utility';
import { CreditChargeResolverService } from './credit-charge-resolver.service';

/**
 * Creates a server-priced credit top-up session and hands it to a gateway.
 *
 * The same order of operations as a subscription checkout, and for the same
 * reason: the session row — carrying the amount AND the credit it will grant —
 * is committed BEFORE the gateway is called, so a payment that succeeds while
 * our response is lost can be reconciled rather than becoming money with no
 * matching order.
 *
 * The gateway plumbing is deliberately NOT shared with `CheckoutService`. That
 * class narrows every helper to `SubscriptionCheckoutSession` and builds its
 * description from `billingInterval`, which a top-up does not have; widening it
 * would have meant a nullable interval on the one path that must never guess at
 * what it is charging for.
 */
@Injectable()
export class CreditTopupCheckoutService {
  private readonly logger = new Logger(CreditTopupCheckoutService.name);

  constructor(
    private readonly sessions: CheckoutSessionRepository,
    private readonly charges: CreditChargeResolverService,
    private readonly catalog: PlanCatalogClient,
    private readonly paypal: PaypalAdapter,
    private readonly paymob: PaymobAdapter,
    private readonly runtimeConfig: GatewayRuntimeConfigService,
  ) {}

  /** The purchasable catalog, proxied so checkout has one origin. */
  async listPackages(): Promise<CreditPackageVersionView[]> {
    return this.catalog.listCreditPackages();
  }

  async start(input: StartCreditTopupInput): Promise<CreditTopupSessionView> {
    this.logger.debug(`start: user=${input.userId} package=${input.packageId}`);

    // A replayed request returns the ORIGINAL session. Creating a second
    // payable order for one intent is how a customer gets charged twice, and a
    // key reused across purpose classes is a caller bug, not a replay.
    const existing = await this.sessions.findByIdempotencyKey(input.userId, input.idempotencyKey);
    if (existing !== null) {
      if (!isCreditTopupCheckoutSession(existing)) {
        throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
      }
      this.logger.log(`start: replaying existing session=${existing.id}`);
      return toCreditTopupSessionView(existing);
    }

    const charge = await this.charges.resolve(input.packageId, input.gateway);
    const session = await this.createSession(input, charge);

    try {
      return await this.attachGatewayOrder(session, input);
    } catch (error: unknown) {
      await this.sessions.markFailed(session.id, BillingErrorCode.GATEWAY_UNAVAILABLE);
      this.logger.error(
        `start: gateway order failed session=${session.id} code=${BillingErrorCode.GATEWAY_UNAVAILABLE}`,
      );
      throw error;
    }
  }

  async findOwned(userId: string, sessionId: string): Promise<CreditTopupSessionView> {
    this.logger.debug(`findOwned: user=${userId} session=${sessionId}`);
    const session = await this.sessions.findById(sessionId);
    // A foreign session is NOT FOUND rather than FORBIDDEN, so the endpoint
    // cannot be used to probe which session ids exist.
    if (session?.userId !== userId || !isCreditTopupCheckoutSession(session)) {
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }
    return toCreditTopupSessionView(session);
  }

  private async createSession(
    input: StartCreditTopupInput,
    charge: ResolvedCreditCharge,
  ): Promise<CreditTopupCheckoutSession> {
    const session = await this.sessions.create({
      userId: input.userId,
      billingEmail: input.userEmail,
      purpose: CheckoutPurpose.CREDIT_TOPUP,
      status: CheckoutSessionStatus.CREATED,
      gateway: input.gateway,
      baseAmountMinor: charge.baseAmountMinor,
      baseCurrency: charge.baseCurrency,
      chargeAmountMinor: charge.chargeAmountMinor,
      chargeCurrency: charge.chargeCurrency,
      fxQuoteId: charge.fxQuoteId,
      fxFinalRateScaled: charge.fxFinalRateScaled,
      creditPackageId: charge.packageId,
      creditPackageVersionId: charge.packageVersionId,
      creditMicroUsd: charge.creditMicroUsd,
      idempotencyKey: input.idempotencyKey,
      stateNonce: randomBytes(CHECKOUT_STATE_NONCE_BYTES).toString('hex'),
      expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS),
    });
    // The database CHECK already refuses a half-written top-up row. Re-asserting
    // it here is what turns that guarantee into a narrowed type for everything
    // downstream, instead of a cast.
    if (!isCreditTopupCheckoutSession(session)) {
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }
    return session;
  }

  private async attachGatewayOrder(
    session: CreditTopupCheckoutSession,
    input: StartCreditTopupInput,
  ): Promise<CreditTopupSessionView> {
    const order =
      input.gateway === BillingGateway.PAYPAL
        ? await this.createPaypalOrder(session)
        : await this.createPaymobIntention(session, input.userEmail);

    await this.sessions.attachProviderOrder(session.id, order.providerOrderId, order.hostedUrl);
    this.logger.log(`start: session=${session.id} gateway=${input.gateway} order created`);

    return toCreditTopupSessionView({
      ...session,
      status: CheckoutSessionStatus.AWAITING_PAYMENT,
      providerOrderId: order.providerOrderId,
      hostedCheckoutUrl: order.hostedUrl,
    });
  }

  private async createPaypalOrder(
    session: CreditTopupCheckoutSession,
  ): Promise<{ providerOrderId: string; hostedUrl: string | null }> {
    const result = await this.paypal.createOrder({
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
      idempotencyKey: session.idempotencyKey,
      returnUrl: CreditTopupCheckoutService.buildReturnUrl(session, CREDIT_TOPUP_RETURN_PATH),
      cancelUrl: CreditTopupCheckoutService.buildReturnUrl(session, CREDIT_TOPUP_CANCEL_PATH),
      description: CREDIT_TOPUP_DESCRIPTION_PREFIX,
    });
    return { providerOrderId: result.orderId, hostedUrl: result.approvalUrl };
  }

  private async createPaymobIntention(
    session: CreditTopupCheckoutSession,
    billingEmail: string,
  ): Promise<{ providerOrderId: string; hostedUrl: string | null }> {
    const config = await this.runtimeConfig.getPaymobCheckout();
    const result = await this.paymob.createIntention({
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
      idempotencyKey: session.idempotencyKey,
      billingEmail,
      description: CREDIT_TOPUP_DESCRIPTION_PREFIX,
    });
    return {
      providerOrderId: result.providerOrderId,
      hostedUrl: CreditTopupCheckoutService.buildPaymobCheckoutUrl(
        config.publicKey,
        result.clientSecret,
      ),
    };
  }

  // Built from configuration plus our own session id and nonce. A redirect
  // target supplied by the caller would let an attacker land a paying customer
  // on a page they control.
  private static buildReturnUrl(session: CreditTopupCheckoutSession, path: string): string {
    const base = AppConfig.get().FRONTEND_URL.replace(/\/+$/, '');
    const query = new URLSearchParams({ session: session.id, state: session.stateNonce });
    return `${base}${path}?${query.toString()}`;
  }

  private static buildPaymobCheckoutUrl(publicKey: string, clientSecret: string): string {
    return `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${clientSecret}`;
  }
}

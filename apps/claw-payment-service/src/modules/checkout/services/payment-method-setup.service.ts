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
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { CHECKOUT_STATE_NONCE_BYTES } from '../constants/checkout.constants';
import { PAYMOB_SETUP_AMOUNT_MINOR } from '../../gateways/paymob/constants/paymob.constants';
import {
  type PaymentMethodSetupSessionView,
  type StartPaymentMethodSetupInput,
} from '../types/checkout.types';
import { type CheckoutSession, CheckoutSessionPurpose } from '../../../generated/prisma';

@Injectable()
export class PaymentMethodSetupService {
  private readonly logger = new Logger(PaymentMethodSetupService.name);

  constructor(
    private readonly sessions: CheckoutSessionRepository,
    private readonly paymob: PaymobAdapter,
  ) {}

  async start(input: StartPaymentMethodSetupInput): Promise<PaymentMethodSetupSessionView> {
    const existing = await this.sessions.findByIdempotencyKey(input.userId, input.idempotencyKey);
    if (existing !== null) {
      if (existing.purpose !== CheckoutSessionPurpose.PAYMENT_METHOD_SETUP) {
        throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
      }
      return PaymentMethodSetupService.toView(existing);
    }

    const session = await this.sessions.create({
      userId: input.userId,
      billingEmail: input.userEmail,
      purpose: CheckoutPurpose.PAYMENT_METHOD_SETUP,
      status: CheckoutSessionStatus.CREATED,
      gateway: BillingGateway.PAYMOB,
      planId: null,
      planSlug: null,
      planPriceVersionId: null,
      billingInterval: null,
      baseAmountMinor: PAYMOB_SETUP_AMOUNT_MINOR,
      baseCurrency: AppConfig.get().PAYMOB_CURRENCY,
      chargeAmountMinor: PAYMOB_SETUP_AMOUNT_MINOR,
      chargeCurrency: AppConfig.get().PAYMOB_CURRENCY,
      idempotencyKey: input.idempotencyKey,
      stateNonce: randomBytes(CHECKOUT_STATE_NONCE_BYTES).toString('hex'),
      paymentMethodConsentedAt: new Date(),
      expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS),
    });

    try {
      const intention = await this.paymob.createSetupIntention({
        checkoutSessionId: session.id,
        billingEmail: input.userEmail,
      });
      const hostedUrl = PaymentMethodSetupService.buildHostedUrl(intention.clientSecret);
      await this.sessions.attachProviderOrder(session.id, intention.providerOrderId, hostedUrl);
      return PaymentMethodSetupService.toView({
        ...session,
        status: CheckoutSessionStatus.AWAITING_PAYMENT,
        providerOrderId: intention.providerOrderId,
        hostedCheckoutUrl: hostedUrl,
      });
    } catch (error: unknown) {
      await this.sessions.markFailed(session.id, BillingErrorCode.GATEWAY_UNAVAILABLE);
      this.logger.error(`start: Paymob setup failed session=${session.id}`);
      throw error;
    }
  }

  async findOwned(userId: string, sessionId: string): Promise<PaymentMethodSetupSessionView> {
    const session = await this.sessions.findById(sessionId);
    if (
      session?.userId !== userId ||
      session?.purpose !== CheckoutSessionPurpose.PAYMENT_METHOD_SETUP
    ) {
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }
    return PaymentMethodSetupService.toView(session);
  }

  private static buildHostedUrl(clientSecret: string): string {
    const publicKey = AppConfig.get().PAYMOB_PUBLIC_KEY;
    if (publicKey === undefined) {
      throw new BillingException(BillingErrorCode.GATEWAY_NOT_CONFIGURED);
    }
    const query = new URLSearchParams({ publicKey, clientSecret });
    return `https://accept.paymob.com/unifiedcheckout/?${query.toString()}`;
  }

  private static toView(session: CheckoutSession): PaymentMethodSetupSessionView {
    return {
      id: session.id,
      status: session.status,
      gateway: session.gateway,
      hostedCheckoutUrl: session.hostedCheckoutUrl,
      expiresAt: session.expiresAt.toISOString(),
    };
  }
}

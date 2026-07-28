import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, BillingGateway, CheckoutSessionStatus } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { CheckoutSessionPurpose } from '../../../generated/prisma';
import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaymentCompensationService } from '../../refunds/services/payment-compensation.service';
import { PaymentActivationService } from '../../webhooks/services/payment-activation.service';
import {
  type CompletePaymobCheckoutInput,
  type PaymobCompletionView,
} from '../types/checkout.types';

/**
 * Browser-assisted settlement for Paymob.
 *
 * The browser supplies only the owned Claw session id. Amount, currency,
 * transaction id and final status are all read back from Paymob by the
 * immutable merchant reference, so a forged SDK callback cannot grant access.
 */
@Injectable()
export class PaymobCheckoutCompletionService {
  private readonly logger = new Logger(PaymobCheckoutCompletionService.name);

  constructor(
    private readonly sessions: CheckoutSessionRepository,
    private readonly paymob: PaymobAdapter,
    private readonly activation: PaymentActivationService,
    private readonly compensation: PaymentCompensationService,
  ) {}

  async complete(input: CompletePaymobCheckoutInput): Promise<PaymobCompletionView> {
    const session = await this.sessions.findById(input.sessionId);
    if (session === null || session.userId !== input.userId) {
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }
    if (
      session.gateway !== BillingGateway.PAYMOB ||
      session.chargeAmountMinor === null ||
      session.chargeCurrency === null
    ) {
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }

    const verification = await this.paymob.fetchTransactionByReference(session.id, {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    });
    if (
      !verification.verified ||
      verification.transactionId === null ||
      verification.amountMinor === null ||
      verification.currency === null
    ) {
      await this.sessions.markFailed(session.id, BillingErrorCode.PAYMENT_NOT_VERIFIED);
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    if (session.purpose === CheckoutSessionPurpose.PAYMENT_METHOD_SETUP) {
      await this.compensateSetup(
        session.id,
        session.userId,
        session.providerOrderId,
        verification.transactionId,
        verification.amountMinor,
        verification.currency,
      );
      return {
        status: CheckoutSessionStatus.AWAITING_PAYMENT,
        subscriptionId: null,
        paymentMethodPending: true,
      };
    }

    try {
      const subscriptionId = await this.activation.activate({
        checkoutSessionId: session.id,
        providerTransactionId: verification.transactionId,
        amountMinor: verification.amountMinor,
        currency: verification.currency,
        correlationId: `paymob-return:${verification.transactionId}`,
      });
      return {
        status: CheckoutSessionStatus.COMPLETED,
        subscriptionId,
        paymentMethodPending: false,
      };
    } catch (error: unknown) {
      await this.sessions.markFailed(session.id, BillingErrorCode.PAYMENT_NOT_VERIFIED);
      await this.compensation.compensate({
        checkoutSessionId: session.id,
        userId: session.userId,
        gateway: BillingGateway.PAYMOB,
        providerTransactionId: verification.transactionId,
        providerOrderId: session.providerOrderId,
        amountMinor: verification.amountMinor,
        currency: verification.currency,
        failureCode: BillingErrorCode.PAYMENT_NOT_VERIFIED,
        reason: 'POST_CAPTURE_ACTIVATION_FAILURE',
      });
      throw error;
    }
  }

  private async compensateSetup(
    checkoutSessionId: string,
    userId: string,
    providerOrderId: string | null,
    providerTransactionId: string,
    amountMinor: number,
    currency: string,
  ): Promise<void> {
    await this.compensation.compensate({
      checkoutSessionId,
      userId,
      gateway: BillingGateway.PAYMOB,
      providerTransactionId,
      providerOrderId,
      amountMinor,
      currency,
      failureCode: 'PAYMENT_METHOD_VERIFICATION_CHARGE',
      reason: 'PAYMENT_METHOD_VERIFICATION_CHARGE',
    });
    this.logger.log(`complete: verification charge compensated session=${checkoutSessionId}`);
  }
}

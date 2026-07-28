import { Injectable, Logger } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { BillingErrorCode, BillingGateway, CheckoutSessionStatus } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import {
  isSubscriptionCheckoutSession,
  type SubscriptionCheckoutSession,
} from '../../billing/utilities/checkout-session-purpose.utility';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { PaymentCompensationService } from '../../refunds/services/payment-compensation.service';
import { PaymentActivationService } from '../../webhooks/services/payment-activation.service';
import {
  type CheckoutSessionView,
  type CompletePaypalCheckoutInput,
} from '../types/checkout.types';
import { toCheckoutSessionView } from '../utilities/checkout-view.utility';
import { type PaypalCaptureVerification } from '../../gateways/paypal/types/paypal.types';

@Injectable()
export class PaypalCheckoutCompletionService {
  private readonly logger = new Logger(PaypalCheckoutCompletionService.name);

  constructor(
    private readonly sessions: CheckoutSessionRepository,
    private readonly paypal: PaypalAdapter,
    private readonly activation: PaymentActivationService,
    private readonly compensation: PaymentCompensationService,
  ) {}

  async complete(input: CompletePaypalCheckoutInput): Promise<CheckoutSessionView> {
    const session = await this.requireOwnedSession(input);
    if (session.status === CheckoutSessionStatus.COMPLETED) {
      return toCheckoutSessionView(session);
    }
    PaypalCheckoutCompletionService.assertReturnBinding(session, input);

    const claimed = await this.sessions.claimForCapture(
      input.userId,
      input.sessionId,
      input.providerOrderId,
    );
    if (!claimed) {
      return toCheckoutSessionView(session);
    }

    const verification = await this.captureOrResolve(session);
    if (
      !verification.verified ||
      verification.captureId === null ||
      verification.amountMinor === null ||
      verification.currency === null
    ) {
      await this.sessions.markFailed(session.id, BillingErrorCode.PAYMENT_NOT_VERIFIED);
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    await this.sessions.markStatus(session.id, CheckoutSessionStatus.VERIFIED);
    await this.activateOrCompensate(session, {
      ...verification,
      captureId: verification.captureId,
      amountMinor: verification.amountMinor,
      currency: verification.currency,
    });
    this.logger.log(`complete: captured and activated session=${session.id}`);
    return toCheckoutSessionView({
      ...session,
      status: CheckoutSessionStatus.COMPLETED,
    });
  }

  private async activateOrCompensate(
    session: SubscriptionCheckoutSession,
    verification: PaypalCaptureVerification & {
      captureId: string;
      amountMinor: number;
      currency: string;
    },
  ): Promise<void> {
    try {
      await this.activation.activate({
        checkoutSessionId: session.id,
        providerTransactionId: verification.captureId,
        amountMinor: verification.amountMinor,
        currency: verification.currency,
        correlationId: `paypal-return:${session.id}`,
      });
    } catch (error: unknown) {
      await this.sessions.markFailed(session.id, BillingErrorCode.PAYMENT_NOT_VERIFIED);
      try {
        await this.compensation.compensate({
          checkoutSessionId: session.id,
          userId: session.userId,
          gateway: BillingGateway.PAYPAL,
          providerTransactionId: verification.captureId,
          providerOrderId: session.providerOrderId,
          amountMinor: verification.amountMinor,
          currency: verification.currency,
          failureCode: BillingErrorCode.PAYMENT_NOT_VERIFIED,
          reason: 'POST_CAPTURE_ACTIVATION_FAILURE',
        });
      } catch {
        this.logger.error(`complete: automatic refund queued session=${session.id}`);
      }
      throw error;
    }
  }

  private async requireOwnedSession(
    input: CompletePaypalCheckoutInput,
  ): Promise<SubscriptionCheckoutSession> {
    const session = await this.sessions.findById(input.sessionId);
    if (
      session?.userId !== input.userId ||
      session.gateway !== BillingGateway.PAYPAL ||
      !isSubscriptionCheckoutSession(session)
    ) {
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }
    return session;
  }

  private static assertReturnBinding(
    session: SubscriptionCheckoutSession,
    input: CompletePaypalCheckoutInput,
  ): void {
    if (
      session.providerOrderId !== input.providerOrderId ||
      !PaypalCheckoutCompletionService.statesMatch(session.stateNonce, input.state)
    ) {
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new BillingException(BillingErrorCode.CHECKOUT_SESSION_EXPIRED);
    }
  }

  private static statesMatch(expected: string, received: string): boolean {
    const expectedBytes = Buffer.from(expected, 'utf8');
    const receivedBytes = Buffer.from(received, 'utf8');
    return (
      expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
    );
  }

  private async captureOrResolve(
    session: SubscriptionCheckoutSession,
  ): Promise<PaypalCaptureVerification> {
    const expected = {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    };
    try {
      const captured = await this.paypal.captureOrder(session.providerOrderId ?? '', expected);
      if (captured.verified) {
        return captured;
      }
      this.logger.warn(`captureOrResolve: capture response incomplete session=${session.id}`);
    } catch (error: unknown) {
      this.logger.warn(`captureOrResolve: capture ambiguous session=${session.id}`);
      try {
        return await this.paypal.getOrder(session.providerOrderId ?? '', expected);
      } catch {
        throw error;
      }
    }
    return this.paypal.getOrder(session.providerOrderId ?? '', expected);
  }
}

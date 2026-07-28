import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { isSubscriptionCheckoutSession } from '../../billing/utilities/checkout-session-purpose.utility';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaymentCompensationService } from '../../refunds/services/payment-compensation.service';
import { PAYMOB_TRANSACTION_EVENT } from '../constants/webhook.constants';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import {
  asBoundedString,
  asRecord,
  hashWebhookPayload,
  parseWebhookBody,
} from '../utilities/webhook-payload.utility';
import { asPaymobTransactionId } from '../utilities/paymob-payload.utility';
import { type WebhookHandlingResult, WebhookOutcome } from '../types/webhook.types';
import { PaymentActivationService } from './payment-activation.service';
import { type CheckoutSession, CheckoutSessionPurpose } from '../../../generated/prisma';

/**
 * Handles Paymob transaction callbacks.
 *
 * Same shape as the PayPal handler and for the same reason: HMAC first, record
 * second, read the transaction back from Paymob third, activate last.
 *
 * Paymob sends the HMAC as a query parameter rather than a header, and posts a
 * single untyped transaction callback rather than named events — so the event
 * type is synthesised and the id comes from the transaction itself.
 */
@Injectable()
export class PaymobWebhookService {
  private readonly logger = new Logger(PaymobWebhookService.name);

  constructor(
    private readonly paymob: PaymobAdapter,
    private readonly events: WebhookEventRepository,
    private readonly sessions: CheckoutSessionRepository,
    private readonly activation: PaymentActivationService,
    private readonly compensation: PaymentCompensationService,
  ) {}

  async handle(rawBody: string, receivedHmac: string): Promise<WebhookHandlingResult> {
    const payloadHash = hashWebhookPayload(rawBody);
    const payload = parseWebhookBody(rawBody);
    const transaction = asRecord(payload?.['obj']);
    const providerEventId = asPaymobTransactionId(transaction?.['id']);

    if (transaction === null || providerEventId === null) {
      this.logger.warn('handle: unparseable Paymob callback — ignored');
      return PaymobWebhookService.result(WebhookOutcome.IGNORED);
    }

    const sessionId = PaymobWebhookService.readSessionId(transaction);
    const session = sessionId === null ? null : await this.sessions.findById(sessionId);
    if (session === null) {
      this.logger.error(`handle: callback names no known session transaction=${providerEventId}`);
      return PaymobWebhookService.result(WebhookOutcome.FAILED, {
        failureCode: PaymobWebhookService.missingSessionCode(sessionId),
      });
    }
    const expected = PaymobWebhookService.expectedPayment(session);
    if (expected === null) {
      return PaymobWebhookService.result(WebhookOutcome.FAILED, {
        failureCode: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
      });
    }

    // HMAC is checked over the payload's own canonical field order before any
    // of it becomes trusted state.
    const callback = this.paymob.verifyCallback(transaction, receivedHmac, expected);
    if (callback.mismatchReason === 'HMAC_INVALID') {
      await this.recordForgery(providerEventId, payloadHash);
      return PaymobWebhookService.result(WebhookOutcome.SIGNATURE_INVALID);
    }

    const claimed = await this.events.claim({
      gateway: BillingGateway.PAYMOB,
      providerEventId,
      eventType: PAYMOB_TRANSACTION_EVENT,
      payloadHash,
      signatureValid: true,
    });
    if (claimed === null) {
      return PaymobWebhookService.result(WebhookOutcome.DUPLICATE);
    }

    return this.processTransaction(claimed.id, session, providerEventId, expected);
  }

  // A rejected HMAC is recorded rather than dropped: a forgery attempt is a
  // security signal an operator needs to see.
  private async recordForgery(providerEventId: string, payloadHash: string): Promise<void> {
    this.logger.error(`handle: HMAC invalid transaction=${providerEventId}`);
    await this.events.recordInvalidSignature({
      gateway: BillingGateway.PAYMOB,
      providerEventId,
      eventType: PAYMOB_TRANSACTION_EVENT,
      payloadHash,
      signatureValid: false,
    });
  }

  private async processTransaction(
    eventRowId: string,
    session: CheckoutSession,
    providerTransactionId: string,
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): Promise<WebhookHandlingResult> {
    await this.events.markProcessing(eventRowId);

    // Backend read wins over the callback body, always.
    const verification = await this.paymob.fetchTransaction(providerTransactionId, expected);
    if (!verification.verified) {
      const code = BillingErrorCode.PAYMENT_NOT_VERIFIED;
      this.logger.error(
        `processTransaction: refused session=${session.id} reason=${verification.mismatchReason ?? 'UNKNOWN'}`,
      );
      await this.events.markFailed(eventRowId, code);
      return PaymobWebhookService.result(WebhookOutcome.FAILED, { failureCode: code });
    }

    const amountMinor = verification.amountMinor ?? expected.amountMinor;
    const currency = verification.currency ?? expected.currency;
    if (session.purpose === CheckoutSessionPurpose.PAYMENT_METHOD_SETUP) {
      return this.processSetupTransaction(
        eventRowId,
        session,
        providerTransactionId,
        amountMinor,
        currency,
      );
    }
    if (!isSubscriptionCheckoutSession(session)) {
      await this.events.markFailed(eventRowId, BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
      return PaymobWebhookService.result(WebhookOutcome.FAILED, {
        failureCode: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
      });
    }
    return this.processSubscriptionTransaction(
      eventRowId,
      session,
      providerTransactionId,
      amountMinor,
      currency,
    );
  }

  private async processSetupTransaction(
    eventRowId: string,
    session: CheckoutSession,
    providerTransactionId: string,
    amountMinor: number,
    currency: string,
  ): Promise<WebhookHandlingResult> {
    await this.compensation.compensate({
      checkoutSessionId: session.id,
      userId: session.userId,
      gateway: BillingGateway.PAYMOB,
      providerTransactionId,
      providerOrderId: session.providerOrderId,
      amountMinor,
      currency,
      failureCode: 'PAYMENT_METHOD_VERIFICATION_CHARGE',
      reason: 'PAYMENT_METHOD_VERIFICATION_CHARGE',
    });
    await this.events.markProcessed(eventRowId, null, providerTransactionId);
    return PaymobWebhookService.result(WebhookOutcome.PROCESSED, {
      transactionId: providerTransactionId,
    });
  }

  private async processSubscriptionTransaction(
    eventRowId: string,
    session: CheckoutSession,
    providerTransactionId: string,
    amountMinor: number,
    currency: string,
  ): Promise<WebhookHandlingResult> {
    let subscriptionId: string | null;
    try {
      subscriptionId = await this.activation.activate({
        checkoutSessionId: session.id,
        providerTransactionId,
        amountMinor,
        currency,
        correlationId: providerTransactionId,
      });
    } catch (error: unknown) {
      await this.sessions.markFailed(session.id, BillingErrorCode.PAYMENT_NOT_VERIFIED);
      await this.events.markFailed(eventRowId, BillingErrorCode.PAYMENT_NOT_VERIFIED);
      await this.compensateActivationFailure(session, providerTransactionId, amountMinor, currency);
      throw error;
    }

    await this.events.markProcessed(eventRowId, subscriptionId, providerTransactionId);
    return PaymobWebhookService.result(WebhookOutcome.PROCESSED, {
      subscriptionId,
      transactionId: providerTransactionId,
    });
  }

  private async compensateActivationFailure(
    session: CheckoutSession,
    providerTransactionId: string,
    amountMinor: number,
    currency: string,
  ): Promise<void> {
    try {
      await this.compensation.compensate({
        checkoutSessionId: session.id,
        userId: session.userId,
        gateway: BillingGateway.PAYMOB,
        providerTransactionId,
        providerOrderId: session.providerOrderId,
        amountMinor,
        currency,
        failureCode: BillingErrorCode.PAYMENT_NOT_VERIFIED,
        reason: 'POST_CAPTURE_ACTIVATION_FAILURE',
      });
    } catch {
      this.logger.error(`processTransaction: automatic refund queued session=${session.id}`);
    }
  }

  private static expectedPayment(
    session: CheckoutSession,
  ): { amountMinor: number; currency: string; checkoutSessionId: string } | null {
    if (session.purpose === CheckoutSessionPurpose.PAYMENT_METHOD_SETUP) {
      if (session.chargeAmountMinor === null || session.chargeCurrency === null) {
        return null;
      }
      return {
        amountMinor: session.chargeAmountMinor,
        currency: session.chargeCurrency,
        checkoutSessionId: session.id,
      };
    }
    if (!isSubscriptionCheckoutSession(session)) {
      return null;
    }
    return {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    };
  }

  private static missingSessionCode(sessionId: string | null): BillingErrorCode {
    return sessionId === null
      ? BillingErrorCode.PAYMENT_REFERENCE_MISMATCH
      : BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND;
  }

  // Paymob echoes our checkout session id through the intention's merchant
  // order reference. It is what binds a transaction to exactly one session.
  private static readSessionId(transaction: Record<string, unknown>): string | null {
    const order = asRecord(transaction['order']);
    return order === null ? null : asBoundedString(order['merchant_order_id'], 64);
  }

  private static result(
    outcome: WebhookOutcome,
    extra: Partial<WebhookHandlingResult> = {},
  ): WebhookHandlingResult {
    return {
      outcome,
      subscriptionId: extra.subscriptionId ?? null,
      transactionId: extra.transactionId ?? null,
      failureCode: extra.failureCode ?? null,
    };
  }
}

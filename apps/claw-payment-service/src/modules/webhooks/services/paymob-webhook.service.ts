import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { isSubscriptionCheckoutSession } from '../../billing/utilities/checkout-session-purpose.utility';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
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
        failureCode:
          sessionId === null
            ? BillingErrorCode.PAYMENT_REFERENCE_MISMATCH
            : BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND,
      });
    }
    if (!isSubscriptionCheckoutSession(session)) {
      this.logger.log(`handle: setup transaction ignored session=${session.id}`);
      return PaymobWebhookService.result(WebhookOutcome.IGNORED);
    }

    // HMAC is checked over the payload's own canonical field order before any
    // of it becomes trusted state.
    const callback = this.paymob.verifyCallback(transaction, receivedHmac, {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    });
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

    return this.processTransaction(claimed.id, session, providerEventId);
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
    session: { id: string; chargeAmountMinor: number; chargeCurrency: string },
    providerTransactionId: string,
  ): Promise<WebhookHandlingResult> {
    await this.events.markProcessing(eventRowId);

    // Backend read wins over the callback body, always.
    const verification = await this.paymob.fetchTransaction(providerTransactionId, {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    });
    if (!verification.verified) {
      const code = BillingErrorCode.PAYMENT_NOT_VERIFIED;
      this.logger.error(
        `processTransaction: refused session=${session.id} reason=${verification.mismatchReason ?? 'UNKNOWN'}`,
      );
      await this.events.markFailed(eventRowId, code);
      return PaymobWebhookService.result(WebhookOutcome.FAILED, { failureCode: code });
    }

    const subscriptionId = await this.activation.activate({
      checkoutSessionId: session.id,
      providerTransactionId,
      amountMinor: verification.amountMinor ?? 0,
      currency: verification.currency ?? session.chargeCurrency,
      correlationId: providerTransactionId,
    });

    await this.events.markProcessed(eventRowId, subscriptionId, providerTransactionId);
    return PaymobWebhookService.result(WebhookOutcome.PROCESSED, {
      subscriptionId,
      transactionId: providerTransactionId,
    });
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

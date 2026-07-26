import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { type PaypalWebhookHeaders } from '../../gateways/paypal/types/paypal.types';
import { PAYPAL_HANDLED_EVENTS } from '../constants/webhook.constants';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import {
  asBoundedString,
  asEventId,
  asEventType,
  asRecord,
  hashWebhookPayload,
  parseWebhookBody,
} from '../utilities/webhook-payload.utility';
import {
  type PayableSession,
  type WebhookHandlingResult,
  WebhookOutcome,
} from '../types/webhook.types';
import { PaymentActivationService } from './payment-activation.service';

/**
 * Handles PayPal webhooks.
 *
 * The order of operations is the security design:
 *
 *   1. verify the signature over the RAW bytes,
 *   2. record the event (the unique index arbitrates replays),
 *   3. read the order back FROM PAYPAL,
 *   4. only then activate.
 *
 * Step 3 matters most. The webhook body is attacker-influenceable in a world
 * where a signature scheme is ever broken or misconfigured; an authenticated
 * server-to-server read of the order is not. We never activate on what the
 * webhook says the amount was — only on what PayPal tells us when we ask.
 */
@Injectable()
export class PaypalWebhookService {
  private readonly logger = new Logger(PaypalWebhookService.name);

  constructor(
    private readonly paypal: PaypalAdapter,
    private readonly events: WebhookEventRepository,
    private readonly sessions: CheckoutSessionRepository,
    private readonly activation: PaymentActivationService,
  ) {}

  async handle(rawBody: string, headers: PaypalWebhookHeaders): Promise<WebhookHandlingResult> {
    const payloadHash = hashWebhookPayload(rawBody);
    const payload = parseWebhookBody(rawBody);
    const providerEventId = asEventId(payload?.['id']);
    const eventType = asEventType(payload?.['event_type']);

    if (payload === null || providerEventId === null || eventType === null) {
      this.logger.warn('handle: unparseable or unbounded PayPal webhook — ignored');
      return PaypalWebhookService.result(WebhookOutcome.IGNORED);
    }

    const signatureValid = await this.paypal.verifyWebhookSignature(headers, rawBody);
    if (!signatureValid) {
      // Recorded, not silently dropped: a forgery attempt is a security signal
      // an operator needs to see.
      await this.events.recordInvalidSignature({
        gateway: BillingGateway.PAYPAL,
        providerEventId,
        eventType,
        payloadHash,
        signatureValid: false,
      });
      this.logger.error(`handle: signature invalid event=${providerEventId}`);
      return PaypalWebhookService.result(WebhookOutcome.SIGNATURE_INVALID);
    }

    const claimed = await this.events.claim({
      gateway: BillingGateway.PAYPAL,
      providerEventId,
      eventType,
      payloadHash,
      signatureValid: true,
    });
    if (claimed === null) {
      return PaypalWebhookService.result(WebhookOutcome.DUPLICATE);
    }

    if (eventType !== PAYPAL_HANDLED_EVENTS.CAPTURE_COMPLETED) {
      // An event type we do not act on is not a failure. Recording it IGNORED
      // keeps the audit trail complete without guessing at a financial action.
      await this.events.markIgnored(claimed.id);
      return PaypalWebhookService.result(WebhookOutcome.IGNORED);
    }

    return this.processCapture(claimed.id, payload, providerEventId);
  }

  private async processCapture(
    eventRowId: string,
    payload: Record<string, unknown>,
    correlationId: string,
  ): Promise<WebhookHandlingResult> {
    await this.events.markProcessing(eventRowId);
    const session = await this.resolvePayableSession(payload);
    if (session === null) {
      return this.fail(eventRowId, BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }

    // Server-to-server read. The webhook told us something happened; PayPal
    // itself tells us what.
    const verification = await this.paypal.getOrder(session.providerOrderId, {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    });
    if (!verification.verified || verification.captureId === null) {
      this.logger.error(
        `processCapture: refused session=${session.id} ` +
          `reason=${verification.mismatchReason ?? 'UNKNOWN'}`,
      );
      return this.fail(eventRowId, BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    const subscriptionId = await this.activation.activate({
      checkoutSessionId: session.id,
      providerTransactionId: verification.captureId,
      amountMinor: verification.amountMinor ?? 0,
      currency: verification.currency ?? session.chargeCurrency,
      correlationId,
    });

    await this.events.markProcessed(eventRowId, subscriptionId, verification.captureId);
    return PaypalWebhookService.result(WebhookOutcome.PROCESSED, {
      subscriptionId,
      transactionId: verification.captureId,
    });
  }

  // Resolves the capture to one of our sessions that actually reached a
  // gateway. A session with no provider order has nothing to read back, and
  // reading back is the only thing we trust.
  private async resolvePayableSession(
    payload: Record<string, unknown>,
  ): Promise<PayableSession | null> {
    const sessionId = PaypalWebhookService.readCustomId(payload);
    if (sessionId === null) {
      return null;
    }
    const session = await this.sessions.findById(sessionId);
    const providerOrderId = session?.providerOrderId ?? null;
    if (session === null || providerOrderId === null) {
      return null;
    }
    return {
      id: session.id,
      providerOrderId,
      chargeAmountMinor: session.chargeAmountMinor,
      chargeCurrency: session.chargeCurrency,
    };
  }

  // Marks the event failed with a stable machine code and returns the matching
  // result. Never a provider message — those can carry payer details.
  private async fail(eventRowId: string, code: BillingErrorCode): Promise<WebhookHandlingResult> {
    await this.events.markFailed(eventRowId, code);
    return PaypalWebhookService.result(WebhookOutcome.FAILED, { failureCode: code });
  }

  // `custom_id` is what binds a PayPal capture to exactly one of our sessions.
  private static readCustomId(payload: Record<string, unknown>): string | null {
    const resource = asRecord(payload['resource']);
    return resource === null ? null : asBoundedString(resource['custom_id'], 64);
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

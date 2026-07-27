import { Injectable, Logger } from '@nestjs/common';
import {
  BillingErrorCode,
  BillingGateway,
  EventPattern,
  SubscriptionStatus,
} from '@claw/shared-types';

import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { PaymentTransactionRepository } from '../../billing/repositories/payment-transaction.repository';
import { SubscriptionLifecycleService } from '../../billing/services/subscription-lifecycle.service';
import { isSubscriptionCheckoutSession } from '../../billing/utilities/checkout-session-purpose.utility';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { type PaypalWebhookHeaders } from '../../gateways/paypal/types/paypal.types';
import { SubscriptionRepository } from '../../subscriptions/repositories/subscription.repository';
import { PAYPAL_HANDLED_EVENTS, PAYPAL_REVERSAL_EVENTS } from '../constants/webhook.constants';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { hashGatewaySubscriptionId } from '../utilities/gateway-subscription-hash.utility';
import { readReversalSubject } from '../utilities/paypal-reversal.utility';
import { PaymentReversalService } from './payment-reversal.service';
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
    private readonly reversals: PaymentReversalService,
    private readonly transactions: PaymentTransactionRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly lifecycle: SubscriptionLifecycleService,
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

    return this.dispatch(eventType, claimed.id, payload, providerEventId);
  }

  /**
   * Routes a verified, claimed event to its handler.
   *
   * Anything not named here is recorded IGNORED rather than guessed at: a webhook
   * we do not understand must never take a financial action by default, and
   * recording it keeps the audit trail complete.
   */
  private async dispatch(
    eventType: string,
    eventRowId: string,
    payload: Record<string, unknown>,
    correlationId: string,
  ): Promise<WebhookHandlingResult> {
    if (eventType === PAYPAL_HANDLED_EVENTS.CAPTURE_COMPLETED) {
      return this.processCapture(eventRowId, payload, correlationId);
    }
    if (eventType === PAYPAL_HANDLED_EVENTS.CAPTURE_DENIED) {
      return this.processDenied(eventRowId, payload);
    }
    if (PAYPAL_REVERSAL_EVENTS.includes(eventType)) {
      return this.processReversal(eventRowId, payload, eventType, correlationId);
    }
    if (eventType === PAYPAL_HANDLED_EVENTS.SUBSCRIPTION_CANCELLED) {
      return this.processSubscriptionEnded(
        eventRowId,
        payload,
        SubscriptionStatus.CANCELLED,
        EventPattern.BILLING_SUBSCRIPTION_CANCELLED,
        correlationId,
      );
    }
    if (eventType === PAYPAL_HANDLED_EVENTS.SUBSCRIPTION_SUSPENDED) {
      return this.processSubscriptionEnded(
        eventRowId,
        payload,
        SubscriptionStatus.SUSPENDED,
        EventPattern.BILLING_SUBSCRIPTION_SUSPENDED,
        correlationId,
      );
    }
    if (eventType === PAYPAL_HANDLED_EVENTS.SUBSCRIPTION_PAYMENT_FAILED) {
      return this.processPaymentFailed(eventRowId, payload, correlationId);
    }

    await this.events.markIgnored(eventRowId);
    return PaypalWebhookService.result(WebhookOutcome.IGNORED);
  }

  /**
   * A capture PayPal refused.
   *
   * Nothing to revoke — the payment never succeeded, so there is no entitlement
   * and no charge row. The session is marked failed so the frontend's poll stops
   * showing "pending" forever, and the reason is a stable machine code rather
   * than a provider message that could carry payer details.
   */
  private async processDenied(
    eventRowId: string,
    payload: Record<string, unknown>,
  ): Promise<WebhookHandlingResult> {
    await this.events.markProcessing(eventRowId);
    const sessionId = PaypalWebhookService.readCustomId(payload);
    if (sessionId !== null) {
      await this.sessions.markFailed(sessionId, BillingErrorCode.PAYMENT_REQUIRED);
      this.logger.warn(`processDenied: session=${sessionId} payment refused by PayPal`);
    }
    await this.events.markProcessed(eventRowId, null, null);
    return PaypalWebhookService.result(WebhookOutcome.PROCESSED);
  }

  /**
   * A refund or a dispute reversal.
   *
   * The subscription is resolved from OUR records via the reversed capture, not
   * from anything in the webhook body — the body names a capture, and the mapping
   * from capture to subscription is ours to know.
   */
  private async processReversal(
    eventRowId: string,
    payload: Record<string, unknown>,
    eventType: string,
    correlationId: string,
  ): Promise<WebhookHandlingResult> {
    await this.events.markProcessing(eventRowId);
    const subject = readReversalSubject(payload);
    const original =
      subject.captureId === null
        ? null
        : await this.transactions.findByProviderTransactionId(
            BillingGateway.PAYPAL,
            subject.captureId,
          );

    if (original === null || original.subscriptionId === null) {
      // We cannot tie the reversal to a charge we recorded. Failing loudly is
      // right: silently succeeding would leave a reversal with no effect on
      // entitlement, which is the worst of both outcomes.
      this.logger.error('processReversal: no recorded charge matches the reversed capture');
      return this.fail(eventRowId, BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
    }

    const request = {
      originalTransactionId: original.id,
      subscriptionId: original.subscriptionId,
      userId: original.userId,
      gateway: BillingGateway.PAYPAL,
      // Falls back to the full original charge: a reversal we cannot size is
      // treated as complete, because under-recording a reversal would leave
      // entitlement standing on money we no longer have.
      amountMinor: subject.amountMinor ?? original.amountMinor,
      currency: subject.currency ?? original.currency,
      providerAmountMinor: subject.amountMinor,
      providerCurrency: subject.currency,
      providerTransactionId: subject.reversalId,
      invoiceId: null,
      correlationId,
    };

    const isChargeback = eventType === PAYPAL_HANDLED_EVENTS.CAPTURE_REVERSED;
    const applied = isChargeback
      ? await this.reversals.chargeback(request)
      : await this.reversals.refund(request);

    if (!applied) {
      // Already recorded. A redelivered notification is a duplicate, not a
      // failure.
      await this.events.markIgnored(eventRowId);
      return PaypalWebhookService.result(WebhookOutcome.DUPLICATE);
    }

    await this.events.markProcessed(eventRowId, original.subscriptionId, subject.reversalId);
    return PaypalWebhookService.result(WebhookOutcome.PROCESSED, {
      subscriptionId: original.subscriptionId,
      transactionId: subject.reversalId,
    });
  }

  /**
   * A PayPal-native subscription that was cancelled or suspended at the gateway.
   *
   * Entitlement is revoked without a money movement: nothing is being refunded,
   * the customer simply stops being subscribed. Resolved through the encrypted
   * gateway-subscription lookup hash, so the plaintext gateway id never has to be
   * queried or logged.
   */
  private async processSubscriptionEnded(
    eventRowId: string,
    payload: Record<string, unknown>,
    status: SubscriptionStatus,
    pattern: EventPattern,
    correlationId: string,
  ): Promise<WebhookHandlingResult> {
    await this.events.markProcessing(eventRowId);
    const subscription = await this.resolveGatewaySubscription(payload);
    if (subscription === null) {
      this.logger.error('processSubscriptionEnded: no local subscription matches the gateway id');
      return this.fail(eventRowId, BillingErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    await this.lifecycle.revokeEntitlement({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      status,
      pattern,
      correlationId,
    });
    await this.events.markProcessed(eventRowId, subscription.id, null);
    return PaypalWebhookService.result(WebhookOutcome.PROCESSED, {
      subscriptionId: subscription.id,
    });
  }

  /**
   * A recurring payment PayPal could not collect.
   *
   * Marked PAST_DUE rather than revoked: the customer keeps access through the
   * configured grace period so a temporarily declined card does not lock them out
   * mid-sentence. The grace sweep is what eventually downgrades them.
   */
  private async processPaymentFailed(
    eventRowId: string,
    payload: Record<string, unknown>,
    correlationId: string,
  ): Promise<WebhookHandlingResult> {
    await this.events.markProcessing(eventRowId);
    const subscription = await this.resolveGatewaySubscription(payload);
    if (subscription === null) {
      this.logger.error('processPaymentFailed: no local subscription matches the gateway id');
      return this.fail(eventRowId, BillingErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    await this.lifecycle.markPastDue(subscription.id, subscription.userId, correlationId);
    await this.events.markProcessed(eventRowId, subscription.id, null);
    return PaypalWebhookService.result(WebhookOutcome.PROCESSED, {
      subscriptionId: subscription.id,
    });
  }

  // Resolves a gateway subscription id in a payload to one of our rows via the
  // lookup hash, so the encrypted id itself is never decrypted for a comparison.
  private async resolveGatewaySubscription(
    payload: Record<string, unknown>,
  ): Promise<{ id: string; userId: string } | null> {
    const resource = asRecord(payload['resource']);
    const gatewayId = resource === null ? null : asBoundedString(resource['id'], 64);
    if (gatewayId === null) {
      return null;
    }
    const found = await this.subscriptions.findByGatewayLookupHash(
      BillingGateway.PAYPAL,
      hashGatewaySubscriptionId(gatewayId),
    );
    return found === null ? null : { id: found.id, userId: found.userId };
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
    if (session === null || providerOrderId === null || !isSubscriptionCheckoutSession(session)) {
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

import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaymentMethodVaultService } from '../../subscriptions/services/payment-method-vault.service';
import { PAYMOB_CARD_TOKEN_EVENT } from '../constants/webhook.constants';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { readCardExpiry, readCardLast4 } from '../utilities/paymob-card.utility';
import {
  asBoundedString,
  asRecord,
  hashWebhookPayload,
  parseWebhookBody,
} from '../utilities/webhook-payload.utility';
import { type WebhookHandlingResult, WebhookOutcome } from '../types/webhook.types';

/**
 * Paymob's card-token callback — the only way a saved card enters the system.
 *
 * Paymob posts this separately from the transaction callback, after the customer
 * ticks "save this card" in hosted checkout. It carries the reusable gateway
 * token and a masked PAN; the real card never touches these servers.
 *
 * The order of operations is the security design, and it matters more here than
 * on the transaction path because the artefact being created is a credential that
 * can charge the customer again:
 *
 * 1. **Verify the HMAC** before any of the body becomes trusted state. The
 *    adapter refuses to extract anything from an unverified payload.
 * 2. **Record the event**, so a replay is arbitrated by the unique index rather
 *    than by application logic.
 * 3. **Resolve the user from OUR records**, via the Paymob order id → checkout
 *    session → userId. Nothing in the callback body decides whose card this is;
 *    a forged payload therefore cannot attach a card to another account.
 * 4. **Vault it**, which independently requires recorded consent.
 *
 * Nothing here logs the token or the masked PAN.
 */
@Injectable()
export class PaymobCardTokenService {
  private readonly logger = new Logger(PaymobCardTokenService.name);

  constructor(
    private readonly paymob: PaymobAdapter,
    private readonly events: WebhookEventRepository,
    private readonly sessions: CheckoutSessionRepository,
    private readonly vault: PaymentMethodVaultService,
  ) {}

  async handle(rawBody: string, receivedHmac: string): Promise<WebhookHandlingResult> {
    const payloadHash = hashWebhookPayload(rawBody);
    const payload = parseWebhookBody(rawBody);
    const card = asRecord(payload?.['obj']) ?? payload;
    if (card === null) {
      this.logger.warn('handle: unparseable Paymob card-token callback — ignored');
      return PaymobCardTokenService.result(WebhookOutcome.IGNORED);
    }

    // Step 1 — verification. `extractSavedCard` returns null unless the HMAC
    // checks out, so an unverified payload can never reach the vault.
    const saved = this.paymob.extractSavedCard(card, receivedHmac);
    if (saved === null) {
      await this.events.recordInvalidSignature({
        gateway: BillingGateway.PAYMOB,
        providerEventId: PaymobCardTokenService.readTokenEventId(card),
        eventType: PAYMOB_CARD_TOKEN_EVENT,
        payloadHash,
        signatureValid: false,
      });
      this.logger.error('handle: card-token callback failed HMAC verification');
      return PaymobCardTokenService.result(WebhookOutcome.SIGNATURE_INVALID);
    }

    // Step 2 — claim. A redelivered callback stops here.
    const claimed = await this.events.claim({
      gateway: BillingGateway.PAYMOB,
      providerEventId: PaymobCardTokenService.readTokenEventId(card),
      eventType: PAYMOB_CARD_TOKEN_EVENT,
      payloadHash,
      signatureValid: true,
    });
    if (claimed === null) {
      return PaymobCardTokenService.result(WebhookOutcome.DUPLICATE);
    }

    await this.events.markProcessing(claimed.id);

    // Step 3 — whose card is this? Answered from our own session record.
    const orderId = asBoundedString(card['order_id'], 64);
    const session =
      orderId === null
        ? null
        : await this.sessions.findByProviderOrderId(BillingGateway.PAYMOB, orderId);
    if (session === null) {
      this.logger.error('handle: card-token callback names no known order');
      await this.events.markFailed(claimed.id, BillingErrorCode.PAYMENT_REFERENCE_MISMATCH);
      return PaymobCardTokenService.result(WebhookOutcome.FAILED, {
        failureCode: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
      });
    }

    // Step 4 — vault. Consent is the vault's own precondition; a session that did
    // not ask to save the card has no consent timestamp and is refused there.
    const expiry = readCardExpiry(card);
    const vaulted = await this.vault.vaultCard({
      userId: session.userId,
      gateway: BillingGateway.PAYMOB,
      gatewayToken: saved.gatewayToken,
      brand: saved.brand,
      last4: readCardLast4(saved.maskedPan),
      expiryMonth: expiry.month,
      expiryYear: expiry.year,
      // First saved card becomes the default; the vault clears the flag elsewhere.
      makeDefault: true,
      // Reaching this callback at all means the customer ticked "save this card"
      // in Paymob's hosted form — that tick IS the consent, and this is when it
      // happened.
      consentedAt: new Date(),
    });

    await this.events.markProcessed(claimed.id, null, vaulted.paymentMethodId);
    this.logger.log(
      `handle: card vaulted method=${vaulted.paymentMethodId} ` +
        `existing=${String(vaulted.alreadyExisted)}`,
    );
    return PaymobCardTokenService.result(WebhookOutcome.PROCESSED, {
      transactionId: vaulted.paymentMethodId,
    });
  }

  /**
   * A stable id for the audit row.
   *
   * Paymob does not send an event id on this callback, so the token id is used —
   * it is unique per saved card and is what makes a redelivery collide on the
   * `(gateway, providerEventId)` unique index.
   */
  private static readTokenEventId(card: Record<string, unknown>): string {
    return asBoundedString(card['id'], 64) ?? asBoundedString(card['token'], 64) ?? 'unknown';
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

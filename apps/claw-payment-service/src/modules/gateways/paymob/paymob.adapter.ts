import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, BillingGateway, HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';
import { type ZodType } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import {
  PAYMOB_BASE_URL,
  PAYMOB_MAX_RETRY_ATTEMPTS,
  PAYMOB_PATHS,
  PAYMOB_RETRY_BASE_DELAY_MS,
  PAYMOB_RETRYABLE_STATUS_CODES,
  PAYMOB_SETUP_AMOUNT_MINOR,
  PAYMOB_SETUP_DESCRIPTION,
} from './constants/paymob.constants';
import {
  paymobCardTokenSchema,
  paymobIntentionResponseSchema,
  paymobRefundResponseSchema,
  type PaymobTransaction,
  paymobTransactionSchema,
} from './schemas/paymob-response.schema';
import { PaymobTokenManager } from './managers/paymob-token.manager';
import { verifyPaymobCardTokenHmac, verifyPaymobHmac } from './utilities/paymob-hmac.utility';
import {
  type PaymobIntentionInput,
  type PaymobIntentionResult,
  type PaymobSavedCard,
  type PaymobSetupIntentionInput,
  type PaymobVerificationResult,
} from './types/paymob.types';

// The ONLY file in this service that speaks Paymob.
//
// Paymob's redirect result is display-only: the browser can be told anything.
// The source of truth is the server-side transaction read plus a verified HMAC,
// which is what every method here is arranged around.
@Injectable()
export class PaymobAdapter {
  private readonly logger = new Logger(PaymobAdapter.name);

  constructor(private readonly tokens: PaymobTokenManager) {}

  // Creates a server-priced intention. The checkout session id travels as
  // special_reference / merchant_order_id so the callback can be tied back to
  // exactly one session.
  async createIntention(input: PaymobIntentionInput): Promise<PaymobIntentionResult> {
    this.logger.debug(`createIntention: session=${input.checkoutSessionId}`);
    const config = AppConfig.get();
    if (config.PAYMOB_SECRET_KEY === undefined || config.PAYMOB_CARD_INTEGRATION_ID === undefined) {
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE);
    }
    const body = {
      amount: input.amountMinor,
      currency: input.currency,
      payment_methods: [Number.parseInt(config.PAYMOB_CARD_INTEGRATION_ID, 10)],
      special_reference: input.checkoutSessionId,
      items: [
        {
          name: input.description,
          amount: input.amountMinor,
          quantity: 1,
        },
      ],
      billing_data: {
        email: input.billingEmail,
        first_name: 'ClawAI',
        last_name: 'Subscriber',
        phone_number: 'NA',
      },
      extras: { checkoutSessionId: input.checkoutSessionId },
      ...PaymobAdapter.callbackUrls(input.checkoutSessionId),
    };

    const intention = await this.send(
      HttpMethod.POST,
      PAYMOB_PATHS.INTENTION,
      paymobIntentionResponseSchema,
      body,
      // Creating an intention is idempotent from our side via special_reference:
      // a repeat for the same session is rejected by Paymob rather than
      // producing a second payable order.
      true,
    );

    return {
      intentionId: String(intention.id),
      providerOrderId: String(intention.intention_order_id ?? intention.id),
      clientSecret: intention.client_secret,
    };
  }

  async createSetupIntention(input: PaymobSetupIntentionInput): Promise<PaymobIntentionResult> {
    const config = AppConfig.get();
    if (config.PAYMOB_SECRET_KEY === undefined || config.PAYMOB_CARD_INTEGRATION_ID === undefined) {
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE);
    }
    const intention = await this.send(
      HttpMethod.POST,
      PAYMOB_PATHS.INTENTION,
      paymobIntentionResponseSchema,
      {
        amount: PAYMOB_SETUP_AMOUNT_MINOR,
        currency: config.PAYMOB_CURRENCY,
        payment_methods: [Number.parseInt(config.PAYMOB_CARD_INTEGRATION_ID, 10)],
        special_reference: input.checkoutSessionId,
        items: [
          {
            name: PAYMOB_SETUP_DESCRIPTION,
            amount: PAYMOB_SETUP_AMOUNT_MINOR,
            quantity: 1,
          },
        ],
        billing_data: {
          email: input.billingEmail,
          first_name: 'ClawAI',
          last_name: 'Subscriber',
          phone_number: 'NA',
        },
        extras: {
          checkoutSessionId: input.checkoutSessionId,
          paymentMethodSetup: true,
        },
        description: PAYMOB_SETUP_DESCRIPTION,
        ...PaymobAdapter.callbackUrls(input.checkoutSessionId),
      },
      true,
    );
    return {
      intentionId: String(intention.id),
      providerOrderId: String(intention.intention_order_id ?? intention.id),
      clientSecret: intention.client_secret,
    };
  }

  // Verifies a callback: HMAC first, then the business facts. Parsing the
  // payload into trusted state before the signature check would mean acting on
  // attacker-controlled data.
  verifyCallback(
    payload: Record<string, unknown>,
    receivedHmac: string,
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): PaymobVerificationResult {
    const config = AppConfig.get();
    if (config.PAYMOB_HMAC_SECRET === undefined) {
      this.logger.error('verifyCallback: PAYMOB_HMAC_SECRET is not configured');
      return PaymobAdapter.mismatch('HMAC_INVALID');
    }
    if (!verifyPaymobHmac(payload, receivedHmac, config.PAYMOB_HMAC_SECRET)) {
      this.logger.warn('verifyCallback: HMAC verification failed');
      return PaymobAdapter.mismatch('HMAC_INVALID');
    }
    const parsed = paymobTransactionSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.error('verifyCallback: payload failed schema validation');
      return PaymobAdapter.mismatch('NOT_SUCCESSFUL');
    }
    return PaymobAdapter.verifyTransaction(parsed.data, expected);
  }

  // Reads the transaction back from Paymob. Used to resolve an ambiguous
  // callback and by reconciliation — a backend read always beats a redirect.
  async fetchTransaction(
    transactionId: string,
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): Promise<PaymobVerificationResult> {
    const accessToken = await this.tokens.getAccessToken();
    const transaction = await this.send(
      HttpMethod.GET,
      `${PAYMOB_PATHS.TRANSACTION}/${transactionId}`,
      paymobTransactionSchema,
      undefined,
      true,
      { Authorization: `Bearer ${accessToken}` },
      false,
    );
    return PaymobAdapter.verifyTransaction(transaction, expected);
  }

  async fetchTransactionByReference(
    merchantOrderId: string,
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): Promise<PaymobVerificationResult> {
    const accessToken = await this.tokens.getAccessToken();
    const transaction = await this.send(
      HttpMethod.POST,
      PAYMOB_PATHS.TRANSACTION_INQUIRY,
      paymobTransactionSchema,
      {
        auth_token: accessToken,
        merchant_order_id: merchantOrderId,
      },
      true,
      {},
      false,
    );
    return PaymobAdapter.verifyTransaction(transaction, expected);
  }

  // Every check must pass. `success` alone is not enough: a transaction can be
  // successful and subsequently voided or refunded, and treating that as paid
  // would grant a plan the customer no longer paid for.
  private static verifyTransaction(
    transaction: PaymobTransaction,
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): PaymobVerificationResult {
    const transactionId = String(transaction.id);
    if (transaction.pending === true) {
      return PaymobAdapter.mismatch('PENDING', transactionId);
    }
    if (!transaction.success) {
      return PaymobAdapter.mismatch('NOT_SUCCESSFUL', transactionId);
    }
    if (
      transaction.is_refunded === true ||
      transaction.is_voided === true ||
      transaction.error_occured === true
    ) {
      return PaymobAdapter.mismatch('REVERSED', transactionId);
    }
    if (transaction.currency !== expected.currency) {
      return PaymobAdapter.mismatch('CURRENCY_MISMATCH', transactionId);
    }
    // amount_cents is already integer minor units — no decimal parsing, so no
    // opportunity for a float to creep into the comparison.
    const amountMinor = Number(transaction.amount_cents);
    if (!Number.isSafeInteger(amountMinor) || amountMinor !== expected.amountMinor) {
      return PaymobAdapter.mismatch('AMOUNT_MISMATCH', transactionId);
    }
    if (transaction.order?.merchant_order_id !== expected.checkoutSessionId) {
      return PaymobAdapter.mismatch('SESSION_MISMATCH', transactionId);
    }
    return {
      verified: true,
      transactionId,
      amountMinor,
      currency: transaction.currency,
      checkoutSessionId: expected.checkoutSessionId,
      mismatchReason: null,
    };
  }

  private static mismatch(
    reason: PaymobVerificationResult['mismatchReason'],
    transactionId: string | null = null,
  ): PaymobVerificationResult {
    return {
      verified: false,
      transactionId,
      amountMinor: null,
      currency: null,
      checkoutSessionId: null,
      mismatchReason: reason,
    };
  }

  // Extracts a saved-card record from a verified card-token callback. Only the
  // gateway token and masked metadata are returned — a PAN never reaches this
  // service, and the return type has nowhere to put one.
  extractSavedCard(payload: Record<string, unknown>, receivedHmac: string): PaymobSavedCard | null {
    const config = AppConfig.get();
    if (
      config.PAYMOB_HMAC_SECRET === undefined ||
      !verifyPaymobCardTokenHmac(payload, receivedHmac, config.PAYMOB_HMAC_SECRET)
    ) {
      this.logger.warn('extractSavedCard: refusing an unverified card-token callback');
      return null;
    }
    const parsed = paymobCardTokenSchema.safeParse(payload);
    if (!parsed.success) {
      return null;
    }
    return {
      gatewayToken: parsed.data.token,
      maskedPan: parsed.data.masked_pan,
      brand: parsed.data.card_subtype ?? null,
    };
  }

  async refund(
    transactionId: string,
    amountMinor: number,
    idempotencyKey: string,
  ): Promise<{ refundId: string }> {
    this.logger.log(`refund: transaction=${transactionId}`);
    const refund = await this.send(
      HttpMethod.POST,
      PAYMOB_PATHS.REFUND,
      paymobRefundResponseSchema,
      { transaction_id: transactionId, amount_cents: amountMinor },
      false,
      { 'Idempotency-Key': idempotencyKey },
    );
    if (!refund.success) {
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }
    return { refundId: String(refund.id) };
  }

  private async send<T>(
    method: HttpMethod,
    path: string,
    schema: ZodType<T>,
    body: unknown,
    retryable: boolean,
    additionalHeaders: Readonly<Record<string, string>> = {},
    useSecretAuthorization: boolean = true,
  ): Promise<T> {
    const config = AppConfig.get();
    if (config.PAYMOB_SECRET_KEY === undefined) {
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE);
    }
    const maxAttempts = retryable
      ? Math.min(PAYMOB_MAX_RETRY_ATTEMPTS, config.PAYMENT_GATEWAY_MAX_RETRIES)
      : 1;
    let lastStatus = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await httpRequest<unknown>({
        url: `${PAYMOB_BASE_URL}${path}`,
        method,
        headers: {
          ...(useSecretAuthorization ? { Authorization: `Token ${config.PAYMOB_SECRET_KEY}` } : {}),
          ...additionalHeaders,
        },
        body,
        timeoutMs: config.PAYMENT_GATEWAY_TIMEOUT_MS,
      });
      if (response.ok) {
        const parsed = schema.safeParse(response.data);
        if (!parsed.success) {
          // The body is NOT logged — a Paymob payload can carry masked card
          // metadata and billing details.
          this.logger.error(`send: ${method} ${path} response failed schema validation`);
          throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
        }
        return parsed.data;
      }
      lastStatus = response.status;
      if (!PAYMOB_RETRYABLE_STATUS_CODES.includes(response.status)) {
        break;
      }
      if (attempt < maxAttempts) {
        await PaymobAdapter.delay(PAYMOB_RETRY_BASE_DELAY_MS * attempt);
      }
    }
    this.logger.error(`send: ${method} ${path} failed status=${String(lastStatus)}`);
    throw new BillingException(BillingErrorCode.GATEWAY_UNAVAILABLE);
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private static callbackUrls(checkoutSessionId: string): {
    notification_url: string;
    redirection_url: string;
  } {
    const base = AppConfig.get().FRONTEND_URL.replace(/\/+$/, '');
    const redirectQuery = new URLSearchParams({
      session: checkoutSessionId,
      gateway: BillingGateway.PAYMOB,
    });
    return {
      notification_url: `${base}/api/v1/payments/webhooks/paymob`,
      redirection_url: `${base}/billing/return?${redirectQuery.toString()}`,
    };
  }
}

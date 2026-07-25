import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';
import { type ZodType } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import {
  PAYPAL_ACTIVE_SUBSCRIPTION_STATUSES,
  PAYPAL_MAX_RETRY_ATTEMPTS,
  PAYPAL_PATHS,
  PAYPAL_RETRY_BASE_DELAY_MS,
  PAYPAL_RETRYABLE_STATUS_CODES,
  PAYPAL_TERMINAL_SUCCESS_STATUSES,
  PAYPAL_WEBHOOK_VERIFICATION_SUCCESS,
} from './constants/paypal.constants';
import { PaypalTokenManager } from './managers/paypal-token.manager';
import {
  paypalOrderResponseSchema,
  paypalRefundResponseSchema,
  paypalSubscriptionResponseSchema,
  paypalWebhookVerificationSchema,
} from './schemas/paypal-response.schema';
import { minorToPaypalAmount, paypalAmountToMinor } from './utilities/paypal-amount.utility';
import {
  type PaypalCaptureVerification,
  type PaypalCreateOrderInput,
  type PaypalOrderResult,
  type PaypalRefundResult,
  type PaypalSubscriptionResult,
  type PaypalWebhookHeaders,
} from './types/paypal.types';

// The ONLY file in this service that speaks PayPal REST.
//
// Everything it returns has been validated with Zod first: a gateway is an
// untrusted external system, and a shape change or a compromised response must
// fail loudly here rather than quietly activating a subscription.
//
// Nothing here reads a price from its caller's request body — amounts arrive
// from an immutable PlanPriceVersion snapshot resolved server-side.
@Injectable()
export class PaypalAdapter {
  private readonly logger = new Logger(PaypalAdapter.name);

  constructor(private readonly tokens: PaypalTokenManager) {}

  // Creates a server-priced order. `custom_id` binds it to our checkout session
  // so the later capture (or webhook) can be matched to exactly one session;
  // `PayPal-Request-Id` makes a retry return the SAME order instead of a
  // second one the customer could also pay.
  async createOrder(input: PaypalCreateOrderInput): Promise<PaypalOrderResult> {
    this.logger.debug(`createOrder: session=${input.checkoutSessionId}`);
    const body = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: input.checkoutSessionId,
          invoice_id: input.idempotencyKey,
          description: input.description,
          amount: {
            currency_code: input.currency,
            value: minorToPaypalAmount(input.amountMinor),
          },
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    const order = await this.send(
      HttpMethod.POST,
      PAYPAL_PATHS.ORDERS,
      paypalOrderResponseSchema,
      body,
      input.idempotencyKey,
      // Safe to retry: the request id makes a repeat idempotent at PayPal.
      true,
    );

    return {
      orderId: order.id,
      status: order.status,
      approvalUrl: null,
    };
  }

  // Captures an approved order and verifies the result before the caller is
  // allowed to treat it as paid.
  //
  // Deliberately NOT retried: a duplicate capture charges the customer twice,
  // and an ambiguous timeout is resolved by reading the order back rather than
  // by capturing again.
  async captureOrder(
    orderId: string,
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): Promise<PaypalCaptureVerification> {
    this.logger.debug(`captureOrder: order=${orderId}`);
    const order = await this.send(
      HttpMethod.POST,
      `${PAYPAL_PATHS.ORDERS}/${orderId}/capture`,
      paypalOrderResponseSchema,
      {},
      orderId,
      false,
    );
    return PaypalAdapter.verifyOrder(order, expected);
  }

  // Reads an order back without mutating it. This is how an ambiguous capture
  // (timeout, connection reset) is resolved safely.
  async getOrder(
    orderId: string,
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): Promise<PaypalCaptureVerification> {
    const order = await this.send(
      HttpMethod.GET,
      `${PAYPAL_PATHS.ORDERS}/${orderId}`,
      paypalOrderResponseSchema,
      undefined,
      orderId,
      true,
    );
    return PaypalAdapter.verifyOrder(order, expected);
  }

  // Every check must pass. A partial match is a refusal: an order that is
  // terminal but for the wrong amount, or bound to a different session, is
  // exactly what a tampering attempt looks like.
  private static verifyOrder(
    order: { status: string; purchase_units: ReadonlyArray<Record<string, unknown>> },
    expected: { amountMinor: number; currency: string; checkoutSessionId: string },
  ): PaypalCaptureVerification {
    const unit = order.purchase_units[0] as
      | { custom_id?: string; payments?: { captures?: ReadonlyArray<Record<string, unknown>> } }
      | undefined;
    const capture = unit?.payments?.captures?.[0] as
      { id: string; status: string; amount: { currency_code: string; value: string } } | undefined;

    if (!capture) {
      return PaypalAdapter.mismatch(order.status, 'NO_CAPTURE');
    }
    if (!PAYPAL_TERMINAL_SUCCESS_STATUSES.includes(capture.status)) {
      return PaypalAdapter.mismatch(capture.status, 'NOT_TERMINAL', capture.id);
    }
    if (capture.amount.currency_code !== expected.currency) {
      return PaypalAdapter.mismatch(capture.status, 'CURRENCY_MISMATCH', capture.id);
    }
    const amountMinor = paypalAmountToMinor(capture.amount.value);
    if (amountMinor !== expected.amountMinor) {
      return PaypalAdapter.mismatch(capture.status, 'AMOUNT_MISMATCH', capture.id);
    }
    if (unit?.custom_id !== expected.checkoutSessionId) {
      return PaypalAdapter.mismatch(capture.status, 'SESSION_MISMATCH', capture.id);
    }

    return {
      verified: true,
      captureId: capture.id,
      status: capture.status,
      amountMinor,
      currency: capture.amount.currency_code,
      checkoutSessionId: expected.checkoutSessionId,
      mismatchReason: null,
    };
  }

  private static mismatch(
    status: string,
    reason: PaypalCaptureVerification['mismatchReason'],
    captureId: string | null = null,
  ): PaypalCaptureVerification {
    return {
      verified: false,
      captureId,
      status,
      amountMinor: null,
      currency: null,
      checkoutSessionId: null,
      mismatchReason: reason,
    };
  }

  // Asks PayPal to verify a webhook signature. The raw body must be the EXACT
  // bytes received — re-serializing the parsed JSON changes key order and
  // whitespace, and the signature then fails for a genuine event.
  async verifyWebhookSignature(headers: PaypalWebhookHeaders, rawBody: string): Promise<boolean> {
    const config = AppConfig.get();
    if (config.PAYPAL_WEBHOOK_ID === undefined) {
      // No webhook id means no way to verify. Refuse rather than trust.
      this.logger.error('verifyWebhookSignature: PAYPAL_WEBHOOK_ID is not configured');
      return false;
    }
    const body = {
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: config.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody) as unknown,
    };
    const result = await this.send(
      HttpMethod.POST,
      PAYPAL_PATHS.VERIFY_WEBHOOK,
      paypalWebhookVerificationSchema,
      body,
      headers.transmissionId,
      true,
    );
    const verified = result.verification_status === PAYPAL_WEBHOOK_VERIFICATION_SUCCESS;
    if (!verified) {
      this.logger.warn(`verifyWebhookSignature: rejected transmission=${headers.transmissionId}`);
    }
    return verified;
  }

  async getSubscription(subscriptionId: string): Promise<PaypalSubscriptionResult> {
    const subscription = await this.send(
      HttpMethod.GET,
      `${PAYPAL_PATHS.SUBSCRIPTIONS}/${subscriptionId}`,
      paypalSubscriptionResponseSchema,
      undefined,
      subscriptionId,
      true,
    );
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      isActive: PAYPAL_ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status),
      nextBillingTime: subscription.billing_info?.next_billing_time ?? null,
      checkoutSessionId: subscription.custom_id ?? null,
    };
  }

  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    this.logger.log(`cancelSubscription: ${subscriptionId}`);
    await this.sendRaw(
      HttpMethod.POST,
      `${PAYPAL_PATHS.SUBSCRIPTIONS}/${subscriptionId}/cancel`,
      { reason },
      subscriptionId,
      false,
    );
  }

  // Refunds are keyed by our own idempotency key: a retried refund must not
  // return the customer's money twice.
  async refundCapture(
    captureId: string,
    amountMinor: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<PaypalRefundResult> {
    this.logger.log(`refundCapture: capture=${captureId}`);
    const refund = await this.send(
      HttpMethod.POST,
      `${PAYPAL_PATHS.PAYMENT_CAPTURES}/${captureId}/refund`,
      paypalRefundResponseSchema,
      { amount: { currency_code: currency, value: minorToPaypalAmount(amountMinor) } },
      idempotencyKey,
      true,
    );
    return { refundId: refund.id, status: refund.status };
  }

  private async send<T>(
    method: HttpMethod,
    path: string,
    schema: ZodType<T>,
    body: unknown,
    idempotencyKey: string,
    retryable: boolean,
  ): Promise<T> {
    const raw = await this.sendRaw(method, path, body, idempotencyKey, retryable);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      // The body is NOT logged — it can contain payer details.
      this.logger.error(`send: ${method} ${path} response failed schema validation`);
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }
    return parsed.data;
  }

  private async sendRaw(
    method: HttpMethod,
    path: string,
    body: unknown,
    idempotencyKey: string,
    retryable: boolean,
  ): Promise<unknown> {
    const config = AppConfig.get();
    const maxAttempts = retryable
      ? Math.min(PAYPAL_MAX_RETRY_ATTEMPTS, config.PAYMENT_GATEWAY_MAX_RETRIES)
      : 1;
    let lastStatus = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const token = await this.tokens.getAccessToken();
      const response = await httpRequest<unknown>({
        url: `${PaypalTokenManager.baseUrl()}${path}`,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'PayPal-Request-Id': idempotencyKey,
        },
        body: body === undefined ? undefined : body,
        timeoutMs: config.PAYMENT_GATEWAY_TIMEOUT_MS,
      });

      if (response.ok) {
        return response.data;
      }
      lastStatus = response.status;

      // A 401 usually means the cached token died early; drop it so the retry
      // re-authenticates instead of replaying the same dead token.
      if (response.status === 401) {
        this.tokens.invalidate();
      }
      if (!PAYPAL_RETRYABLE_STATUS_CODES.includes(response.status) && response.status !== 401) {
        break;
      }
      if (attempt < maxAttempts) {
        await PaypalAdapter.delay(PAYPAL_RETRY_BASE_DELAY_MS * attempt);
      }
    }

    // Status only. A PayPal error body can echo payer information.
    this.logger.error(`sendRaw: ${method} ${path} failed status=${String(lastStatus)}`);
    throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

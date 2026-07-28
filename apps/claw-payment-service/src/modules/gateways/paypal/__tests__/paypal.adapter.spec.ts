import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { PaypalAdapter } from '../paypal.adapter';
import { PaypalTokenManager } from '../managers/paypal-token.manager';

// Mocked at the HTTP boundary, not the service boundary: the point of these
// tests is that the adapter's own request-building, response-validation and
// verification logic is exercised for real.
jest.mock('@claw/shared-utilities', () => ({
  ...jest.requireActual('@claw/shared-utilities'),
  httpRequest: jest.fn(),
}));

const mockHttp = httpRequest as unknown as jest.Mock;

const EXPECTED = { amountMinor: 500, currency: 'USD', checkoutSessionId: 'cs_1' };

const orderResponse = (overrides: {
  status?: string;
  captureStatus?: string;
  value?: string;
  currency?: string;
  customId?: string;
  withCapture?: boolean;
  approvalHref?: string;
}) => ({
  id: 'ORDER1',
  status: overrides.status ?? 'COMPLETED',
  purchase_units: [
    {
      custom_id: overrides.customId ?? 'cs_1',
      payments:
        overrides.withCapture === false
          ? {}
          : {
              captures: [
                {
                  id: 'CAP1',
                  status: overrides.captureStatus ?? 'COMPLETED',
                  amount: {
                    currency_code: overrides.currency ?? 'USD',
                    value: overrides.value ?? '5.00',
                  },
                },
              ],
            },
    },
  ],
  links: [
    {
      href: overrides.approvalHref ?? 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1',
      rel: 'approve',
      method: 'GET',
    },
  ],
});

const okResponse = (data: unknown) => ({ ok: true, status: 200, data });

describe('PaypalAdapter', () => {
  let adapter: PaypalAdapter;
  let tokens: PaypalTokenManager;

  beforeEach(() => {
    mockHttp.mockReset();
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYPAL_ENV: 'sandbox',
      PAYPAL_CLIENT_ID: 'id',
      PAYPAL_CLIENT_SECRET: 'secret',
      PAYPAL_WEBHOOK_ID: 'WH1',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
      PAYMENT_GATEWAY_MAX_RETRIES: 3,
    } as unknown as ReturnType<typeof AppConfig.get>);
    tokens = new PaypalTokenManager();
    jest.spyOn(tokens, 'getAccessToken').mockResolvedValue('tok');
    adapter = new PaypalAdapter(tokens);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrder', () => {
    it('accepts PayPal default minimal create-order representation', async () => {
      mockHttp.mockResolvedValue(
        okResponse({
          id: 'ORDER1',
          status: 'CREATED',
          links: [
            {
              href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1',
              rel: 'approve',
              method: 'GET',
            },
          ],
        }),
      );

      await expect(
        adapter.createOrder({
          amountMinor: 500,
          currency: 'USD',
          checkoutSessionId: 'cs_1',
          idempotencyKey: 'idem-minimal',
          returnUrl: 'https://claw.local/billing/return',
          cancelUrl: 'https://claw.local/billing/cancelled',
          description: 'Starter monthly',
        }),
      ).resolves.toMatchObject({
        orderId: 'ORDER1',
        status: 'CREATED',
      });
    });

    it('returns the trusted PayPal approval URL', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({ status: 'CREATED' })));

      await expect(
        adapter.createOrder({
          amountMinor: 500,
          currency: 'USD',
          checkoutSessionId: 'cs_1',
          idempotencyKey: 'idem-approval',
          returnUrl: 'https://claw.local/billing/return',
          cancelUrl: 'https://claw.local/billing/cancelled',
          description: 'Starter monthly',
        }),
      ).resolves.toMatchObject({
        approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1',
      });
    });

    it('rejects an approval URL outside PayPal', async () => {
      mockHttp.mockResolvedValue(
        okResponse(
          orderResponse({
            status: 'CREATED',
            approvalHref: 'https://attacker.example/steal-session',
          }),
        ),
      );

      await expect(
        adapter.createOrder({
          amountMinor: 500,
          currency: 'USD',
          checkoutSessionId: 'cs_1',
          idempotencyKey: 'idem-host',
          returnUrl: 'https://claw.local/billing/return',
          cancelUrl: 'https://claw.local/billing/cancelled',
          description: 'Starter monthly',
        }),
      ).rejects.toThrow();
    });

    it('sends the server-side price, never a client-supplied one', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({ status: 'CREATED' })));
      await adapter.createOrder({
        amountMinor: 2000,
        currency: 'USD',
        checkoutSessionId: 'cs_9',
        idempotencyKey: 'idem-1',
        returnUrl: 'https://claw.local/return',
        cancelUrl: 'https://claw.local/cancel',
        description: 'Pro monthly',
      });
      const body = mockHttp.mock.calls[0]?.[0]?.body as Record<string, unknown>;
      const units = body['purchase_units'] as ReadonlyArray<Record<string, unknown>>;
      expect((units[0]?.['amount'] as Record<string, unknown>)['value']).toBe('20.00');
      expect(units[0]?.['custom_id']).toBe('cs_9');
    });

    it('sends the idempotency key as PayPal-Request-Id so a retry cannot double-charge', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({ status: 'CREATED' })));
      await adapter.createOrder({
        amountMinor: 500,
        currency: 'USD',
        checkoutSessionId: 'cs_1',
        idempotencyKey: 'idem-42',
        returnUrl: 'r',
        cancelUrl: 'c',
        description: 'd',
      });
      expect(mockHttp.mock.calls[0]?.[0]?.headers?.['PayPal-Request-Id']).toBe('idem-42');
    });

    it('bounds the request with the configured timeout', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({ status: 'CREATED' })));
      await adapter.createOrder({
        amountMinor: 500,
        currency: 'USD',
        checkoutSessionId: 'cs_1',
        idempotencyKey: 'i',
        returnUrl: 'r',
        cancelUrl: 'c',
        description: 'd',
      });
      expect(mockHttp.mock.calls[0]?.[0]?.timeoutMs).toBe(10_000);
    });
  });

  describe('capture verification', () => {
    it('accepts a capture that matches on status, amount, currency and session', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({})));
      const result = await adapter.captureOrder('ORDER1', EXPECTED);
      expect(result).toMatchObject({ verified: true, captureId: 'CAP1', amountMinor: 500 });
    });

    it('refuses a non-terminal capture', async () => {
      // APPROVED is a state the user reaches WITHOUT the money moving.
      mockHttp.mockResolvedValue(okResponse(orderResponse({ captureStatus: 'APPROVED' })));
      const result = await adapter.captureOrder('ORDER1', EXPECTED);
      expect(result).toMatchObject({ verified: false, mismatchReason: 'NOT_TERMINAL' });
    });

    it('refuses a capture for the wrong amount', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({ value: '1.00' })));
      const result = await adapter.captureOrder('ORDER1', EXPECTED);
      expect(result).toMatchObject({ verified: false, mismatchReason: 'AMOUNT_MISMATCH' });
    });

    it('refuses a capture in the wrong currency even when the number matches', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({ currency: 'EGP' })));
      const result = await adapter.captureOrder('ORDER1', EXPECTED);
      expect(result).toMatchObject({ verified: false, mismatchReason: 'CURRENCY_MISMATCH' });
    });

    it('refuses a capture bound to a different checkout session', async () => {
      // Paying for one session and claiming another is exactly what session
      // substitution looks like.
      mockHttp.mockResolvedValue(okResponse(orderResponse({ customId: 'cs_someone_else' })));
      const result = await adapter.captureOrder('ORDER1', EXPECTED);
      expect(result).toMatchObject({ verified: false, mismatchReason: 'SESSION_MISMATCH' });
    });

    it('refuses an order with no capture at all', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({ withCapture: false })));
      const result = await adapter.captureOrder('ORDER1', EXPECTED);
      expect(result).toMatchObject({ verified: false, mismatchReason: 'NO_CAPTURE' });
    });

    it('rejects a response that fails schema validation', async () => {
      mockHttp.mockResolvedValue(okResponse({ id: 'ORDER1' }));
      await expect(adapter.captureOrder('ORDER1', EXPECTED)).rejects.toThrow();
    });

    it('never retries a capture, because a duplicate charges the customer twice', async () => {
      mockHttp.mockResolvedValue({ ok: false, status: 500, data: {} });
      await expect(adapter.captureOrder('ORDER1', EXPECTED)).rejects.toThrow();
      expect(mockHttp).toHaveBeenCalledTimes(1);
    });

    it('resolves an ambiguous capture by reading the order back', async () => {
      mockHttp.mockResolvedValue(okResponse(orderResponse({})));
      const result = await adapter.getOrder('ORDER1', EXPECTED);
      expect(result.verified).toBe(true);
      expect(mockHttp.mock.calls[0]?.[0]?.method).toBe('GET');
    });
  });

  describe('webhook signature verification', () => {
    const headers = {
      transmissionId: 't1',
      transmissionTime: '2026-07-26T00:00:00Z',
      transmissionSig: 'sig',
      certUrl: 'https://api.paypal.com/cert',
      authAlgo: 'SHA256withRSA',
    };

    it('accepts only PayPal’s SUCCESS verdict', async () => {
      mockHttp.mockResolvedValue(okResponse({ verification_status: 'SUCCESS' }));
      await expect(adapter.verifyWebhookSignature(headers, '{"id":"evt"}')).resolves.toBe(true);
    });

    it('rejects a FAILURE verdict', async () => {
      mockHttp.mockResolvedValue(okResponse({ verification_status: 'FAILURE' }));
      await expect(adapter.verifyWebhookSignature(headers, '{"id":"evt"}')).resolves.toBe(false);
    });

    it('refuses to verify at all when no webhook id is configured', async () => {
      // Without the id there is no way to check the signature. Trusting the
      // event instead would let anyone activate a paid plan.
      jest.spyOn(AppConfig, 'get').mockReturnValue({
        PAYPAL_ENV: 'sandbox',
        PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
        PAYMENT_GATEWAY_MAX_RETRIES: 3,
      } as unknown as ReturnType<typeof AppConfig.get>);
      await expect(adapter.verifyWebhookSignature(headers, '{"id":"evt"}')).resolves.toBe(false);
      expect(mockHttp).not.toHaveBeenCalled();
    });

    it('forwards the exact raw body it was given', async () => {
      // Re-serializing the parsed JSON changes key order and whitespace, and a
      // genuine event then fails verification.
      mockHttp.mockResolvedValue(okResponse({ verification_status: 'SUCCESS' }));
      await adapter.verifyWebhookSignature(headers, '{"b":2,"a":1}');
      const body = mockHttp.mock.calls[0]?.[0]?.body as Record<string, unknown>;
      expect(body['webhook_event']).toEqual({ b: 2, a: 1 });
      expect(body['webhook_id']).toBe('WH1');
    });
  });

  describe('retry policy', () => {
    it('retries a retryable status on an idempotent read', async () => {
      mockHttp
        .mockResolvedValueOnce({ ok: false, status: 503, data: {} })
        .mockResolvedValueOnce(okResponse(orderResponse({})));
      const result = await adapter.getOrder('ORDER1', EXPECTED);
      expect(result.verified).toBe(true);
      expect(mockHttp).toHaveBeenCalledTimes(2);
    });

    it('does not retry a non-retryable client error', async () => {
      mockHttp.mockResolvedValue({ ok: false, status: 422, data: {} });
      await expect(adapter.getOrder('ORDER1', EXPECTED)).rejects.toThrow();
      expect(mockHttp).toHaveBeenCalledTimes(1);
    });

    it('drops the cached token on 401 so the retry re-authenticates', async () => {
      const invalidate = jest.spyOn(tokens, 'invalidate');
      mockHttp
        .mockResolvedValueOnce({ ok: false, status: 401, data: {} })
        .mockResolvedValueOnce(okResponse(orderResponse({})));
      await adapter.getOrder('ORDER1', EXPECTED);
      expect(invalidate).toHaveBeenCalled();
    });

    it('gives up after the configured attempt ceiling', async () => {
      mockHttp.mockResolvedValue({ ok: false, status: 503, data: {} });
      await expect(adapter.getOrder('ORDER1', EXPECTED)).rejects.toThrow();
      expect(mockHttp).toHaveBeenCalledTimes(3);
    });
  });

  describe('refund', () => {
    it('sends the refund amount as a decimal string with an idempotency key', async () => {
      mockHttp.mockResolvedValue(okResponse({ id: 'RF1', status: 'COMPLETED' }));
      const result = await adapter.refundCapture('CAP1', 500, 'USD', 'refund-idem-1');
      expect(result).toEqual({ refundId: 'RF1', status: 'COMPLETED' });
      const call = mockHttp.mock.calls[0]?.[0];
      expect((call?.body as Record<string, Record<string, string>>)['amount']?.['value']).toBe(
        '5.00',
      );
      expect(call?.headers?.['PayPal-Request-Id']).toBe('refund-idem-1');
    });
  });

  describe('subscription', () => {
    it('reports ACTIVE as active and carries the session binding back', async () => {
      mockHttp.mockResolvedValue(
        okResponse({
          id: 'SUB1',
          status: 'ACTIVE',
          custom_id: 'cs_1',
          billing_info: { next_billing_time: '2026-08-26T00:00:00Z' },
        }),
      );
      const result = await adapter.getSubscription('SUB1');
      expect(result).toEqual({
        subscriptionId: 'SUB1',
        status: 'ACTIVE',
        isActive: true,
        nextBillingTime: '2026-08-26T00:00:00Z',
        checkoutSessionId: 'cs_1',
      });
    });

    it('does not treat SUSPENDED as active', async () => {
      mockHttp.mockResolvedValue(okResponse({ id: 'SUB1', status: 'SUSPENDED' }));
      const result = await adapter.getSubscription('SUB1');
      expect(result.isActive).toBe(false);
    });
  });
});

import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { PaymobAdapter } from '../paymob.adapter';
import { type PaymobTokenManager } from '../managers/paymob-token.manager';
import { computePaymobCardTokenHmac, computePaymobHmac } from '../utilities/paymob-hmac.utility';

jest.mock('@claw/shared-utilities', () => ({
  ...jest.requireActual('@claw/shared-utilities'),
  httpRequest: jest.fn(),
}));

const mockHttp = httpRequest as unknown as jest.Mock;
const SECRET = 'hmac-secret';
const EXPECTED = { amountMinor: 50_000, currency: 'EGP', checkoutSessionId: 'cs_1' };

const transaction = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 123456,
  success: true,
  pending: false,
  is_refunded: false,
  is_voided: false,
  error_occured: false,
  amount_cents: 50_000,
  currency: 'EGP',
  order: { id: 987, merchant_order_id: 'cs_1' },
  ...overrides,
});

describe('PaymobAdapter', () => {
  let adapter: PaymobAdapter;
  let tokens: { getAccessToken: jest.Mock };

  beforeEach(() => {
    mockHttp.mockReset();
    tokens = { getAccessToken: jest.fn().mockResolvedValue('paymob-access-token') };
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYMOB_SECRET_KEY: 'sk',
      PAYMOB_PUBLIC_KEY: 'pk',
      PAYMOB_API_KEY: 'api-key',
      PAYMOB_HMAC_SECRET: SECRET,
      PAYMOB_CARD_INTEGRATION_ID: '4242',
      PAYMOB_CURRENCY: 'EGP',
      FRONTEND_URL: 'https://claw.local',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
      PAYMENT_GATEWAY_MAX_RETRIES: 3,
    } as unknown as ReturnType<typeof AppConfig.get>);
    adapter = new PaymobAdapter(tokens as unknown as PaymobTokenManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createIntention', () => {
    it('sends the server-computed amount and binds the checkout session', async () => {
      mockHttp.mockResolvedValue({
        ok: true,
        status: 200,
        data: { id: 'INT1', client_secret: 'cs_secret', intention_order_id: 987 },
      });
      const result = await adapter.createIntention({
        amountMinor: 50_000,
        currency: 'EGP',
        checkoutSessionId: 'cs_9',
        idempotencyKey: 'idem',
        billingEmail: 'user@example.com',
        description: 'Pro monthly',
      });
      expect(result).toEqual({
        intentionId: 'INT1',
        providerOrderId: '987',
        clientSecret: 'cs_secret',
      });
      const body = mockHttp.mock.calls[0]?.[0]?.body as Record<string, unknown>;
      expect(body['amount']).toBe(50_000);
      expect(body['special_reference']).toBe('cs_9');
      expect(body['notification_url']).toBe('https://claw.local/api/v1/payments/webhooks/paymob');
      expect(body['redirection_url']).toBe(
        'https://claw.local/billing/return?session=cs_9&gateway=PAYMOB',
      );
    });

    it('sends server callbacks to the dedicated public webhook URL', async () => {
      jest.spyOn(AppConfig, 'get').mockReturnValue({
        PAYMOB_SECRET_KEY: 'sk',
        PAYMOB_CARD_INTEGRATION_ID: '4242',
        PAYMOB_WEBHOOK_URL: 'https://billing-webhooks.example.com/payments/webhooks/paymob',
        FRONTEND_URL: 'https://claw.local',
        PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
        PAYMENT_GATEWAY_MAX_RETRIES: 3,
      } as unknown as ReturnType<typeof AppConfig.get>);
      mockHttp.mockResolvedValue({
        ok: true,
        status: 200,
        data: { id: 'INT1', client_secret: 'cs_secret', intention_order_id: 987 },
      });

      await adapter.createIntention({
        amountMinor: 50_000,
        currency: 'EGP',
        checkoutSessionId: 'cs_9',
        idempotencyKey: 'idem',
        billingEmail: 'user@example.com',
        description: 'Pro monthly',
      });

      const body = mockHttp.mock.calls[0]?.[0]?.body as Record<string, unknown>;
      expect(body['notification_url']).toBe(
        'https://billing-webhooks.example.com/payments/webhooks/paymob',
      );
      expect(body['redirection_url']).toBe(
        'https://claw.local/billing/return?session=cs_9&gateway=PAYMOB',
      );
    });

    it('refuses when Paymob is not fully configured', async () => {
      jest.spyOn(AppConfig, 'get').mockReturnValue({
        PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
      } as unknown as ReturnType<typeof AppConfig.get>);
      await expect(
        adapter.createIntention({
          amountMinor: 1,
          currency: 'EGP',
          checkoutSessionId: 'cs',
          idempotencyKey: 'i',
          billingEmail: 'e@e.com',
          description: 'd',
        }),
      ).rejects.toThrow();
      expect(mockHttp).not.toHaveBeenCalled();
    });
  });

  describe('createSetupIntention', () => {
    it('creates Paymobâ€™s minimum-value verification intention without plan fields', async () => {
      mockHttp.mockResolvedValue({
        ok: true,
        status: 200,
        data: { id: 'SETUP1', client_secret: 'setup_secret', intention_order_id: 654 },
      });

      await expect(
        adapter.createSetupIntention({
          checkoutSessionId: 'setup-1',
          billingEmail: 'user@example.com',
        }),
      ).resolves.toEqual({
        intentionId: 'SETUP1',
        providerOrderId: '654',
        clientSecret: 'setup_secret',
      });

      const body = mockHttp.mock.calls[0]?.[0]?.body as Record<string, unknown>;
      expect(body).toMatchObject({
        amount: 10,
        currency: 'EGP',
        special_reference: 'setup-1',
      });
      expect(body['items']).toEqual([
        { name: 'ClawAI saved payment method', amount: 10, quantity: 1 },
      ]);
      expect(JSON.stringify(body)).not.toContain('planId');
    });

    it('refuses setup when Paymob is not fully configured', async () => {
      jest.spyOn(AppConfig, 'get').mockReturnValue({
        PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
      } as unknown as ReturnType<typeof AppConfig.get>);

      await expect(
        adapter.createSetupIntention({
          checkoutSessionId: 'setup-1',
          billingEmail: 'user@example.com',
        }),
      ).rejects.toThrow();
      expect(mockHttp).not.toHaveBeenCalled();
    });
  });

  describe('verifyCallback', () => {
    const signed = (payload: Record<string, unknown>): string => computePaymobHmac(payload, SECRET);

    it('accepts a correctly signed, successful, matching transaction', () => {
      const payload = transaction();
      const result = adapter.verifyCallback(payload, signed(payload), EXPECTED);
      expect(result).toMatchObject({ verified: true, transactionId: '123456' });
    });

    it('rejects a bad HMAC before looking at the business fields', () => {
      // Parsing attacker-controlled data into trusted state before the
      // signature check is the whole vulnerability.
      const payload = transaction();
      const result = adapter.verifyCallback(payload, 'deadbeef', EXPECTED);
      expect(result).toMatchObject({ verified: false, mismatchReason: 'HMAC_INVALID' });
    });

    it('rejects a tampered amount even though the rest is intact', () => {
      const original = transaction();
      const digest = signed(original);
      const tampered = transaction({ amount_cents: 1 });
      expect(adapter.verifyCallback(tampered, digest, EXPECTED)).toMatchObject({
        verified: false,
        mismatchReason: 'HMAC_INVALID',
      });
    });

    it('rejects a successful-but-refunded transaction', () => {
      // success alone is not enough: a payment can succeed and then be reversed.
      const payload = transaction({ is_refunded: true });
      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        verified: false,
        mismatchReason: 'REVERSED',
      });
    });

    it('rejects a voided transaction', () => {
      const payload = transaction({ is_voided: true });
      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        mismatchReason: 'REVERSED',
      });
    });

    it('rejects a pending transaction', () => {
      const payload = transaction({ pending: true });
      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        mismatchReason: 'PENDING',
      });
    });

    it('rejects an unsuccessful transaction', () => {
      const payload = transaction({ success: false });
      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        mismatchReason: 'NOT_SUCCESSFUL',
      });
    });

    it('rejects a signed payload that fails the transaction schema', () => {
      const payload = { id: 123456 };

      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        mismatchReason: 'NOT_SUCCESSFUL',
      });
    });

    it('rejects the wrong amount', () => {
      const payload = transaction({ amount_cents: 100 });
      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        mismatchReason: 'AMOUNT_MISMATCH',
      });
    });

    it('rejects the wrong currency', () => {
      const payload = transaction({ currency: 'USD' });
      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        mismatchReason: 'CURRENCY_MISMATCH',
      });
    });

    it('rejects a callback bound to a different checkout session', () => {
      const payload = transaction({ order: { id: 987, merchant_order_id: 'cs_other' } });
      expect(adapter.verifyCallback(payload, signed(payload), EXPECTED)).toMatchObject({
        mismatchReason: 'SESSION_MISMATCH',
      });
    });

    it('refuses everything when no HMAC secret is configured', () => {
      jest.spyOn(AppConfig, 'get').mockReturnValue({
        PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
      } as unknown as ReturnType<typeof AppConfig.get>);
      const payload = transaction();
      expect(adapter.verifyCallback(payload, 'anything', EXPECTED)).toMatchObject({
        verified: false,
        mismatchReason: 'HMAC_INVALID',
      });
    });
  });

  describe('fetchTransaction', () => {
    it('treats the backend read as the source of truth', async () => {
      mockHttp.mockResolvedValue({ ok: true, status: 200, data: transaction() });
      const result = await adapter.fetchTransaction('123456', EXPECTED);
      expect(result.verified).toBe(true);
      expect(tokens.getAccessToken).toHaveBeenCalledTimes(1);
      expect(mockHttp.mock.calls[0]?.[0]?.headers).toMatchObject({
        Authorization: 'Bearer paymob-access-token',
      });
    });

    it('reads the last transaction by the immutable merchant reference', async () => {
      mockHttp.mockResolvedValue({ ok: true, status: 200, data: transaction() });

      await expect(adapter.fetchTransactionByReference('cs_1', EXPECTED)).resolves.toMatchObject({
        verified: true,
        transactionId: '123456',
      });

      expect(mockHttp.mock.calls[0]?.[0]).toMatchObject({
        url: 'https://accept.paymob.com/api/ecommerce/orders/transaction_inquiry',
        method: 'POST',
        body: {
          auth_token: 'paymob-access-token',
          merchant_order_id: 'cs_1',
        },
      });
    });

    it('rejects a response that fails schema validation', async () => {
      mockHttp.mockResolvedValue({ ok: true, status: 200, data: { id: 1 } });
      await expect(adapter.fetchTransaction('1', EXPECTED)).rejects.toThrow();
    });

    it('retries a retryable status', async () => {
      mockHttp
        .mockResolvedValueOnce({ ok: false, status: 502, data: {} })
        .mockResolvedValueOnce({ ok: true, status: 200, data: transaction() });
      await expect(adapter.fetchTransaction('1', EXPECTED)).resolves.toMatchObject({
        verified: true,
      });
      expect(mockHttp).toHaveBeenCalledTimes(2);
    });

    it('does not retry a client error', async () => {
      mockHttp.mockResolvedValue({ ok: false, status: 400, data: {} });
      await expect(adapter.fetchTransaction('1', EXPECTED)).rejects.toThrow();
      expect(mockHttp).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractSavedCard', () => {
    const cardPayload = (): Record<string, unknown> => ({
      token: 'tok_abc',
      masked_pan: 'xxxx-xxxx-xxxx-2346',
      card_subtype: 'MasterCard',
      order_id: 987,
    });

    it('returns only the gateway token and masked metadata', () => {
      const payload = cardPayload();
      const result = adapter.extractSavedCard(payload, computePaymobCardTokenHmac(payload, SECRET));
      expect(result).toEqual({
        gatewayToken: 'tok_abc',
        maskedPan: 'xxxx-xxxx-xxxx-2346',
        brand: 'MasterCard',
      });
      // There is nowhere in the return type to put a PAN or CVV, by design.
      expect(JSON.stringify(result)).not.toContain('cvv');
    });

    it('refuses an unverified card-token callback', () => {
      expect(adapter.extractSavedCard(cardPayload(), 'bogus')).toBeNull();
    });

    it('refuses a verified callback that does not contain saved-card fields', () => {
      const payload = { order_id: 987 };

      expect(
        adapter.extractSavedCard(payload, computePaymobCardTokenHmac(payload, SECRET)),
      ).toBeNull();
    });
  });

  describe('refund', () => {
    it('returns the refund id on success', async () => {
      mockHttp.mockResolvedValue({ ok: true, status: 200, data: { id: 'RF9', success: true } });
      await expect(adapter.refund('123456', 50_000, 'refund-key-1')).resolves.toEqual({
        refundId: 'RF9',
      });
      expect(mockHttp.mock.calls[0]?.[0]?.headers).toMatchObject({
        'Idempotency-Key': 'refund-key-1',
      });
    });

    it('throws when Paymob reports the refund as unsuccessful', async () => {
      mockHttp.mockResolvedValue({ ok: true, status: 200, data: { id: 'RF9', success: false } });
      await expect(adapter.refund('123456', 50_000, 'refund-key-2')).rejects.toThrow();
    });

    it('never retries a refund', async () => {
      mockHttp.mockResolvedValue({ ok: false, status: 500, data: {} });
      await expect(adapter.refund('1', 1, 'refund-key-3')).rejects.toThrow();
      expect(mockHttp).toHaveBeenCalledTimes(1);
    });
  });
});

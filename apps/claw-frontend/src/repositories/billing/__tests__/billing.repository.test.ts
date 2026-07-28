import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingRepository } from '@/repositories/billing/billing.repository';

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockGetBlob = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    getBlob: (...args: unknown[]) => mockGetBlob(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('billingRepository payment-method setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts only consent and the idempotency key', async () => {
    const response = {
      id: 'setup-1',
      status: 'AWAITING_PAYMENT',
      gateway: 'PAYMOB',
      hostedCheckoutUrl: 'https://accept.paymob.com/unifiedcheckout/',
      expiresAt: '2026-07-28T00:00:00.000Z',
    };
    mockPost.mockResolvedValue({ data: response });

    await expect(
      billingRepository.createPaymentMethodSetupSession({
        idempotencyKey: 'setup-idempotency-1',
        consentToStore: true,
      }),
    ).resolves.toEqual(response);
    expect(mockPost).toHaveBeenCalledWith('/billing/payment-method-setup-sessions', {
      idempotencyKey: 'setup-idempotency-1',
      consentToStore: true,
    });
  });

  it.each([null, '', undefined])(
    'normalizes an empty current-subscription response to null',
    async (data) => {
      mockGet.mockResolvedValue({ data });

      await expect(billingRepository.getCurrent()).resolves.toBeNull();
      expect(mockGet).toHaveBeenCalledWith('/billing/me');
    },
  );

  it('downloads invoices as authenticated PDF blobs', async () => {
    const pdf = new Blob(['invoice'], { type: 'application/pdf' });
    mockGetBlob.mockResolvedValue({ data: pdf });

    await expect(billingRepository.downloadInvoice('invoice-1')).resolves.toBe(pdf);
    expect(mockGetBlob).toHaveBeenCalledWith('/billing/invoices/invoice-1/pdf');
  });

  it('completes PayPal without sending client-owned money or identity fields', async () => {
    const response = {
      id: 'checkout-1',
      status: 'COMPLETED',
      gateway: 'PAYPAL',
      chargeAmountMinor: 500,
      chargeCurrency: 'USD',
      hostedCheckoutUrl: null,
      expiresAt: '2026-07-28T00:00:00.000Z',
    };
    mockPost.mockResolvedValue({ data: response });

    await expect(
      billingRepository.completePaypalCheckout('checkout-1', {
        providerOrderId: '5O190127TN364715T',
        state: 'a'.repeat(64),
      }),
    ).resolves.toEqual(response);
    expect(mockPost).toHaveBeenCalledWith('/billing/checkout-sessions/checkout-1/complete-paypal', {
      providerOrderId: '5O190127TN364715T',
      state: 'a'.repeat(64),
    });
  });

  it('completes Paymob using only the owned session reference', async () => {
    const response = {
      status: 'COMPLETED',
      subscriptionId: 'subscription-1',
      paymentMethodPending: false,
    };
    mockPost.mockResolvedValue({ data: response });

    await expect(billingRepository.completePaymobCheckout('checkout-1')).resolves.toEqual(response);
    expect(mockPost).toHaveBeenCalledWith('/billing/checkout-sessions/checkout-1/complete-paymob');
  });

  it('immediately ends only the authenticated subscription', async () => {
    const response = { id: 'subscription-1', status: 'CANCELLED' };
    mockDelete.mockResolvedValue({ data: response });

    await expect(billingRepository.endSubscriptionNow()).resolves.toEqual(response);
    expect(mockDelete).toHaveBeenCalledWith('/billing/subscription');
  });
});

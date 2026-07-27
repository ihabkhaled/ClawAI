import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingRepository } from '@/repositories/billing/billing.repository';

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockGetBlob = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    getBlob: (...args: unknown[]) => mockGetBlob(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: vi.fn(),
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

  it('downloads invoices as authenticated PDF blobs', async () => {
    const pdf = new Blob(['invoice'], { type: 'application/pdf' });
    mockGetBlob.mockResolvedValue({ data: pdf });

    await expect(billingRepository.downloadInvoice('invoice-1')).resolves.toBe(pdf);
    expect(mockGetBlob).toHaveBeenCalledWith('/billing/invoices/invoice-1/pdf');
  });
});

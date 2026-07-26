import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingRepository } from '@/repositories/billing/billing.repository';

const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: vi.fn(),
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
});

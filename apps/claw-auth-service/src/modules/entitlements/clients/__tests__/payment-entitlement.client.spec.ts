import { Test } from '@nestjs/testing';
import { HttpMethod, SubscriptionStatus } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { PaymentEntitlementClient } from '../payment-entitlement.client';

jest.mock('@claw/shared-utilities', () => ({
  httpRequest: jest.fn(),
}));
jest.mock('../../../../app/config/app.config');

describe('PaymentEntitlementClient', () => {
  let client: PaymentEntitlementClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(AppConfig.get).mockReturnValue({
      PAYMENT_SERVICE_URL: 'http://payment-service:4018',
      INTER_SERVICE_AUTH_TOKEN: 'service-token-with-at-least-32-characters',
    } as ReturnType<typeof AppConfig.get>);
    const module = await Test.createTestingModule({
      providers: [PaymentEntitlementClient],
    }).compile();
    client = module.get(PaymentEntitlementClient);
  });

  it('uses service authentication and validates the authoritative response', async () => {
    jest.mocked(httpRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: paidEntitlement(),
    });

    await expect(client.getAuthoritativeEntitlement('user-1')).resolves.toMatchObject({
      hasPaidEntitlement: true,
      planId: 'plan-1',
    });
    expect(httpRequest).toHaveBeenCalledWith({
      url: 'http://payment-service:4018/internal/payments/users/user-1/entitlement',
      method: HttpMethod.GET,
      headers: {
        Authorization: 'Service service-token-with-at-least-32-characters',
      },
      timeoutMs: 5000,
    });
  });

  it('rejects a response for a different user', async () => {
    jest.mocked(httpRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: paidEntitlement({ userId: 'user-2' }),
    });

    await expect(client.getAuthoritativeEntitlement('user-1')).rejects.toThrow(
      'Payment entitlement response invalid',
    );
  });

  it('rejects malformed and non-success responses', async () => {
    jest.mocked(httpRequest).mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { hasPaidEntitlement: true },
    });
    await expect(client.getAuthoritativeEntitlement('user-1')).rejects.toThrow(
      'Payment entitlement response invalid',
    );

    jest.mocked(httpRequest).mockResolvedValueOnce({
      ok: false,
      status: 503,
      data: null,
    });
    await expect(client.getAuthoritativeEntitlement('user-1')).rejects.toThrow(
      'Payment entitlement lookup failed',
    );
  });
});

function paidEntitlement(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    subscriptionId: 'subscription-1',
    hasPaidEntitlement: true,
    planId: 'plan-1',
    planSlug: 'pro',
    planPriceVersionId: 'price-1',
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    effectiveAt: '2026-07-26T12:00:00.000Z',
    entitlementValidUntil: '2026-08-26T12:00:00.000Z',
    ...overrides,
  };
}

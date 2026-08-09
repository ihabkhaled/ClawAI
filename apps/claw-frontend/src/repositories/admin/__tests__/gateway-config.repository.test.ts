import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingGateway } from '@/enums/billing.enum';

import { gatewayConfigRepository } from '../gateway-config.repository';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

describe('gatewayConfigRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists secret-safe admin gateway configuration', async () => {
    mockGet.mockResolvedValue({ data: [{ gateway: 'PAYPAL', fields: [] }] });

    await expect(gatewayConfigRepository.list()).resolves.toEqual([
      { gateway: 'PAYPAL', fields: [] },
    ]);
    expect(mockGet).toHaveBeenCalledWith('/admin/payment-gateways');
  });

  it('updates an encoded provider without adding secret fields', async () => {
    const payload = { isEnabled: true, credentials: { clientSecret: 'replacement' } };
    mockPut.mockResolvedValue({ data: { gateway: 'PAYPAL', isEnabled: true } });

    await gatewayConfigRepository.update(BillingGateway.PAYPAL, payload);

    expect(mockPut).toHaveBeenCalledWith('/admin/payment-gateways/PAYPAL', payload);
  });
});

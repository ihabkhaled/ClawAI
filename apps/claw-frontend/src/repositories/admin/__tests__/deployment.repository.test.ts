import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deploymentRepository } from '@/repositories/admin/deployment.repository';

const mockGet = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

describe('deployment repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the authenticated admin deployment endpoint', async () => {
    const status = { state: 'completed', targetSha: 'a'.repeat(40) };
    mockGet.mockResolvedValue({ data: status });

    await expect(deploymentRepository.get()).resolves.toBe(status);
    expect(mockGet).toHaveBeenCalledWith('/admin/deployment');
  });
});

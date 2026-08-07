import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auditRepository } from '@/repositories/audit/audit.repository';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('audit repository — user lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deactivates through DELETE on the user resource', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    await auditRepository.deactivateUser('user-1');

    expect(mockDelete).toHaveBeenCalledWith('/users/user-1');
  });

  // The exact method and URL matter: reactivate is a PATCH to a sub-resource,
  // and the body is deliberately empty because the server derives both the
  // target status and the acting administrator itself. A client-supplied status
  // would be a trust-boundary crossing.
  it('reactivates through PATCH on the reactivate sub-resource with no body', async () => {
    mockPatch.mockResolvedValueOnce({ data: undefined });

    await auditRepository.reactivateUser('user-1');

    expect(mockPatch).toHaveBeenCalledWith('/users/user-1/reactivate');
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });

  it('encodes the role change body exactly', async () => {
    mockPatch.mockResolvedValueOnce({ data: undefined });

    await auditRepository.updateUserRole('user-1', 'OPERATOR');

    expect(mockPatch).toHaveBeenCalledWith('/users/user-1/role', { role: 'OPERATOR' });
  });

  it('reads the admin user list from the users collection', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [], total: 0 } });

    await auditRepository.getAdminUsers();

    expect(mockGet).toHaveBeenCalledWith('/users');
  });
});

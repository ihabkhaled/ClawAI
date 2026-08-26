import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  grantConnectorAccess,
  listConnectorGrants,
  listConnectorsSharedWithMe,
  revokeConnectorAccess,
} from '@/repositories/workspace/connector-grant.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('connector-grant.repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listConnectorGrants fetches grants for a connector', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'g1' }] });
    const result = await listConnectorGrants('c1');
    expect(mockGet).toHaveBeenCalledWith('/workspace/connectors/c1/grants');
    expect(result).toEqual([{ id: 'g1' }]);
  });

  it('grantConnectorAccess posts the payload to the connector grants endpoint', async () => {
    mockPost.mockResolvedValue({ data: { id: 'g1' } });
    const result = await grantConnectorAccess('c1', {
      granteeUserId: 'alice',
      accessLevel: 'AI_ACTIONS' as never,
    });
    expect(mockPost).toHaveBeenCalledWith('/workspace/connectors/c1/grants', {
      granteeUserId: 'alice',
      accessLevel: 'AI_ACTIONS',
    });
    expect(result).toEqual({ id: 'g1' });
  });

  it('revokeConnectorAccess deletes the grantee-scoped grant', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await revokeConnectorAccess('c1', 'alice');
    expect(mockDelete).toHaveBeenCalledWith('/workspace/connectors/c1/grants/alice');
  });

  it('listConnectorsSharedWithMe fetches the shared-with-me endpoint', async () => {
    const shared = [
      {
        connectorId: 'c1',
        connectorName: 'My Jira',
        provider: 'JIRA',
        ownerUserId: 'owner-1',
        accessLevel: 'AI_ACTIONS',
        grantedBy: 'owner-1',
        grantedAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    mockGet.mockResolvedValue({ data: shared });
    const result = await listConnectorsSharedWithMe();
    expect(mockGet).toHaveBeenCalledWith('/workspace/connectors/shared-with-me');
    expect(result).toEqual(shared);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginConsentChoice } from '@/enums/plugin-consent-card.enum';

import { pluginConsentRequestsRepository } from '../plugin-consent-requests.repository';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const { apiClient } = await import('@/services/shared/api-client');
const mocks = {
  get: apiClient.get as unknown as ReturnType<typeof vi.fn>,
  post: apiClient.post as unknown as ReturnType<typeof vi.fn>,
  delete: apiClient.delete as unknown as ReturnType<typeof vi.fn>,
};

describe('pluginConsentRequestsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: [] });
    mocks.post.mockResolvedValue({ data: { id: 'r1' } });
    mocks.delete.mockResolvedValue({ data: undefined });
  });

  it('lists the open questions of the signed-in user', async () => {
    await pluginConsentRequestsRepository.listPending();
    expect(mocks.get).toHaveBeenCalledWith('/plugins/consent-requests');
  });

  it('posts a decision to the request id, encoded', async () => {
    await pluginConsentRequestsRepository.decide('a/b', {
      choice: PluginConsentChoice.AlwaysAllow,
      confirmDestructive: true,
    });
    expect(mocks.post).toHaveBeenCalledWith('/plugins/consent-requests/a%2Fb/decision', {
      choice: 'ALWAYS_ALLOW',
      confirmDestructive: true,
    });
  });

  it('lists and revokes per-chat grants', async () => {
    await pluginConsentRequestsRepository.listGrants();
    expect(mocks.get).toHaveBeenCalledWith('/plugins/chat-grants');
    await pluginConsentRequestsRepository.revokeGrant('g1');
    expect(mocks.delete).toHaveBeenCalledWith('/plugins/chat-grants/g1');
  });
});

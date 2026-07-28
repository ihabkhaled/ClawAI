import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  approveVscodeAuthorization,
  getVscodeAuthorizationDetails,
} from '@/repositories/auth/vscode-authorization.repository';

const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    post: (...arguments_: unknown[]) => mockPost(...arguments_),
  },
}));

describe('VS Code authorization repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the authorization request through the authenticated API client', async () => {
    mockPost.mockResolvedValueOnce({
      data: { clientName: 'ClawAI for VS Code', expiresIn: 600 },
      status: 200,
    });

    await expect(getVscodeAuthorizationDetails('request-1')).resolves.toEqual({
      clientName: 'ClawAI for VS Code',
      expiresIn: 600,
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/vscode/authorize/details', {
      requestId: 'request-1',
    });
  });

  it('returns the custom-protocol redirect only after approval', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        redirectUri: 'vscode://clawai.clawai-coding-agent/auth/callback?code=code-1&state=state-1',
      },
      status: 200,
    });

    await expect(approveVscodeAuthorization('request-1')).resolves.toMatchObject({
      redirectUri: expect.stringContaining('vscode://clawai.clawai-coding-agent/'),
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  approveVscodeAuthorization,
  deliverVscodeAuthorization,
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

  it('delivers loopback authorization without navigating away from ClawAI', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const callback = 'http://127.0.0.1:64215/auth/callback?code=one-time-code&state=verified-state';

    await deliverVscodeAuthorization(callback, fetcher);

    expect(fetcher).toHaveBeenCalledWith(callback, {
      cache: 'no-store',
      credentials: 'omit',
      mode: 'no-cors',
    });
  });
});

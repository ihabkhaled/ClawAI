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

  it('delivers loopback authorization with a top-level browser navigation', () => {
    const navigate = vi.fn();
    const callback = 'http://127.0.0.1:64215/auth/callback?code=one-time-code&state=verified-state';

    deliverVscodeAuthorization(callback, navigate);

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(callback);
  });

  it.each([
    'https://127.0.0.1:64215/auth/callback?code=code&state=state',
    'http://127.0.0.1/auth/callback?code=code&state=state',
    'http://localhost:64215/auth/callback?code=code&state=state',
    'http://example.com:64215/auth/callback?code=code&state=state',
    'http://user:password@127.0.0.1:64215/auth/callback?code=code&state=state',
    'http://127.0.0.1:64215/not-auth/callback?code=code&state=state',
  ])('rejects an unsafe loopback authorization callback: %s', (callback) => {
    const navigate = vi.fn();

    expect(() => deliverVscodeAuthorization(callback, navigate)).toThrow(
      'Invalid VS Code authorization callback.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

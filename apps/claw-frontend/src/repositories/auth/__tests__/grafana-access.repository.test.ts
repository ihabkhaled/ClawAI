import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../services/shared/api-client';
import { grantGrafanaAccess } from '../grafana-access.repository';

vi.mock('@/services/shared/api-client');

describe('grantGrafanaAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to /auth/grafana-access and returns only the expiry', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { expiresAt: '2026-09-23T10:15:00.000Z' },
      status: 200,
    });

    await expect(grantGrafanaAccess()).resolves.toEqual({ expiresAt: '2026-09-23T10:15:00.000Z' });
    expect(apiClient.post).toHaveBeenCalledWith('/auth/grafana-access', {});
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackSource } from '@/enums';
import { feedbackAdminRepository } from '@/repositories/feedback/feedback-admin.repository';

const get = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

describe('feedbackAdminRepository.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: { items: [], total: 0, page: 1, limit: 20 } });
  });

  it('passes the source filter as ?source=', async () => {
    await feedbackAdminRepository.list({ page: 1, limit: 20, source: FeedbackSource.PUBLIC });

    expect(get).toHaveBeenCalledWith('/feedback/admin', {
      page: '1',
      limit: '20',
      source: 'PUBLIC',
    });
  });

  it('leaves source out when it is not set', async () => {
    await feedbackAdminRepository.list({ page: 1, limit: 20, source: undefined });

    expect(get.mock.calls[0]?.[1]).not.toHaveProperty('source');
  });
});

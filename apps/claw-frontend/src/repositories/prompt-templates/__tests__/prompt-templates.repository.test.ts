import { beforeEach, describe, expect, it, vi } from 'vitest';

import { promptTemplatesRepository } from '../prompt-templates.repository';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const { apiClient } = await import('@/services/shared/api-client');
const mocked = apiClient as unknown as Record<
  'get' | 'post' | 'patch' | 'delete',
  ReturnType<typeof vi.fn>
>;

describe('promptTemplatesRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists with the query params', async () => {
    mocked.get.mockResolvedValue({ data: { items: [], nextCursor: null } });
    const page = await promptTemplatesRepository.list({ q: 'a', favorite: true, limit: 20 });
    expect(mocked.get).toHaveBeenCalledWith('/chat-prompt-templates', {
      q: 'a',
      favorite: 'true',
      limit: '20',
    });
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it('creates, updates, deletes and marks used on the right routes', async () => {
    mocked.post.mockResolvedValue({ data: { id: '1' } });
    mocked.patch.mockResolvedValue({ data: { id: '1' } });
    mocked.delete.mockResolvedValue({});

    await promptTemplatesRepository.create({ title: 't', body: 'b', tags: [] });
    expect(mocked.post).toHaveBeenCalledWith('/chat-prompt-templates', {
      title: 't',
      body: 'b',
      tags: [],
    });

    await promptTemplatesRepository.update('1', { isFavorite: true });
    expect(mocked.patch).toHaveBeenCalledWith('/chat-prompt-templates/1', { isFavorite: true });

    await promptTemplatesRepository.remove('1');
    expect(mocked.delete).toHaveBeenCalledWith('/chat-prompt-templates/1');

    await promptTemplatesRepository.markUsed('1');
    expect(mocked.post).toHaveBeenLastCalledWith('/chat-prompt-templates/1/use');
  });
});

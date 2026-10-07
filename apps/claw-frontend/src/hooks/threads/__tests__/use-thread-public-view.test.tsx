import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

import { useThreadPublicView } from '../use-thread-public-view';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { recordPublicView: vi.fn() },
}));

const KEY = ['thread-publications', 'public', 'a-slug'];

function setup(isAuthenticated: boolean) {
  const client = new QueryClient();
  client.setQueryData(KEY, { slug: 'a-slug', viewCount: 1, readerCount: 0 });
  const wrapper = ({ children }: PropsWithChildren): React.ReactElement => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  renderHook(() => useThreadPublicView('a-slug', isAuthenticated), { wrapper });
  return client;
}

describe('useThreadPublicView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('counts the visit once and shows the fresh totals', async () => {
    vi.mocked(threadPublicationsRepository.recordPublicView).mockResolvedValue({
      viewCount: 2,
      readerCount: 1,
    });
    const client = setup(true);

    await waitFor(() =>
      expect(client.getQueryData<PublicThreadPublication>(KEY)).toMatchObject({
        viewCount: 2,
        readerCount: 1,
      }),
    );
    expect(threadPublicationsRepository.recordPublicView).toHaveBeenCalledTimes(1);
    expect(threadPublicationsRepository.recordPublicView).toHaveBeenCalledWith('a-slug', true);
  });

  it('stays silent and keeps the old totals when counting fails', async () => {
    vi.mocked(threadPublicationsRepository.recordPublicView).mockRejectedValue(new Error('x'));
    const client = setup(false);

    await waitFor(() =>
      expect(threadPublicationsRepository.recordPublicView).toHaveBeenCalledWith('a-slug', false),
    );
    expect(client.getQueryData<PublicThreadPublication>(KEY)).toMatchObject({ viewCount: 1 });
  });
});

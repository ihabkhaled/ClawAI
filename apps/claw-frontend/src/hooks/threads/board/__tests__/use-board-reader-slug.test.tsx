import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';

import { useBoardReader } from '../use-board-reader';

const ARABIC = 'كيف-يعمل-التمثيل-a1b2c3d4';
const route = vi.hoisted(() => ({ slug: '' }));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: route.slug }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/hooks/common/use-localized-href', () => ({
  useLocalizedHref: () => (path: string) => path,
}));
vi.mock('@/hooks/threads/use-thread-public-actions', () => ({
  useThreadPublicActions: () => ({}),
}));
vi.mock('@/hooks/threads/use-thread-public-view', () => ({ useThreadPublicView: vi.fn() }));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    getPublic: vi.fn(),
    listPublicComments: vi.fn(),
    getPublicReactionSummary: vi.fn(),
  },
}));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useBoardReader route parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(threadPublicationsRepository.getPublic).mockResolvedValue({} as never);
    vi.mocked(threadPublicationsRepository.listPublicComments).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    vi.mocked(threadPublicationsRepository.getPublicReactionSummary).mockResolvedValue({
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
    });
  });

  it('looks the publication up by the decoded slug, not the percent-encoded segment', async () => {
    route.slug = encodeURIComponent(ARABIC);
    const { result } = renderHook(() => useBoardReader(), { wrapper: wrapper() });

    await waitFor(() => expect(threadPublicationsRepository.getPublic).toHaveBeenCalled());
    expect(threadPublicationsRepository.getPublic).toHaveBeenCalledWith(ARABIC);
    expect(threadPublicationsRepository.listPublicComments).toHaveBeenCalledWith(ARABIC, 1);
    expect(result.current.loginHref).toBe(
      `/login?returnTo=${encodeURIComponent(`/board/${encodeURIComponent(ARABIC)}`)}`,
    );
    expect(result.current.publicPath).toBe(`/threads/${encodeURIComponent(ARABIC)}`);
  });

  it('reports not found without any request when the segment is malformed', () => {
    route.slug = '%E0%A4%A';
    const { result } = renderHook(() => useBoardReader(), { wrapper: wrapper() });
    expect(result.current.isNotFound).toBe(true);
    expect(threadPublicationsRepository.getPublic).not.toHaveBeenCalled();
  });
});

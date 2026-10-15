import { ThreadPublicationType } from '@claw/shared-types';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

import { useThreadPublicPage } from '../use-thread-public-page';
import { useThreadPublicQueries } from '../use-thread-public-queries';

const ARABIC = 'كيف-يعمل-التمثيل-a1b2c3d4';

vi.mock('next/navigation', () => ({ useParams: () => ({ slug: encodeURIComponent(ARABIC) }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../use-thread-public-queries', () => ({ useThreadPublicQueries: vi.fn() }));
vi.mock('../use-thread-public-actions', () => ({ useThreadPublicActions: () => ({}) }));
vi.mock('../use-thread-public-view', () => ({ useThreadPublicView: vi.fn() }));
vi.mock('../use-thread-viewer-ownership', () => ({ useThreadViewerOwnership: () => undefined }));
vi.mock('../use-thread-change-credits', () => ({ useThreadChangeCredits: () => [] }));

const PUBLICATION: PublicThreadPublication = {
  slug: ARABIC,
  title: 'T',
  contentLocale: Locale.AR,
  publicationType: ThreadPublicationType.ARTICLE,
  content: { markdown: '# T', citations: [] },
  publishedAt: '2026-10-13T00:00:00.000Z',
  viewCount: 1,
  readerCount: 0,
};

describe('useThreadPublicPage route parameter', () => {
  beforeEach(() => {
    vi.mocked(useThreadPublicQueries).mockReturnValue({
      publication: { data: undefined, error: null, isLoading: false, isError: false },
      comments: { data: [], isLoading: false, isError: false },
      reactions: { data: undefined, isLoading: false, isError: false },
    } as never);
  });

  it('queries, and builds the sign-in return link, with the decoded slug', () => {
    const { result } = renderHook(() => useThreadPublicPage(PUBLICATION));
    expect(vi.mocked(useThreadPublicQueries).mock.calls[0]?.[0]).toBe(ARABIC);
    expect(result.current.loginHref).toBe(
      `/login?returnTo=${encodeURIComponent(`/threads/${encodeURIComponent(ARABIC)}`)}`,
    );
  });
});

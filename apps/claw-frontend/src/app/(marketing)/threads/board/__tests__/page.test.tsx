import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuestBoardPageViewProps } from '@/types/thread-board-view.types';

import PublicThreadsBoardPage, { generateMetadata } from '../page';

const getPublicBoardPage = vi.fn();
const buildMetadata = vi.fn();
let received: GuestBoardPageViewProps | null = null;

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ 'x-claw-locale': 'de' })),
}));
vi.mock('next/script', () => ({
  default: ({ id, children }: { id: string; children: string }) => (
    <script id={id} type="application/ld+json">
      {children}
    </script>
  ),
}));
vi.mock('@/components/threads/board/guest-board-page-view', () => ({
  GuestBoardPageView: (props: GuestBoardPageViewProps) => {
    received = props;
    return <div data-testid="guest-board" />;
  },
}));
vi.mock('@/lib/i18n/dictionary-loader', () => ({
  loadDictionary: () =>
    Promise.resolve({
      chat: {
        threadPublicBoardTitle: 'Board title',
        threadPublicBoardSeoDescription: 'Board description',
      },
    }),
}));
vi.mock('@/lib/seo/public-page-metadata', () => ({
  buildRequestPublicPageMetadata: (slug: string) => buildMetadata(slug),
}));
vi.mock('@/utilities/content-registry.utility', () => ({
  getPageBySlug: () => ({ lastReviewed: '2026-10-14' }),
}));
vi.mock('@/lib/site/site-config', () => ({ getSiteUrl: () => 'https://claw.example' }));
vi.mock('@/lib/threads/public-board-api', () => ({
  getPublicBoardPage: (state: unknown) => getPublicBoardPage(state),
}));

const DATA = {
  items: [
    {
      slug: 'alpha',
      title: 'Alpha',
      excerpt: 'First',
      contentLocale: 'ar',
      publicationType: 'guide',
      publishedAt: '2026-10-01T00:00:00.000Z',
      readingMinutes: 1,
      sourceCount: 0,
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      viewerReaction: null,
    },
  ],
  meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
  didYouMean: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  received = null;
  getPublicBoardPage.mockResolvedValue(DATA);
  buildMetadata.mockResolvedValue({
    title: 'Board | ClawAI',
    robots: { index: true, follow: true },
  });
});

describe('the public Threads board page (server)', () => {
  it('renders the first page on the server from the public Board data', async () => {
    render(await PublicThreadsBoardPage({ searchParams: Promise.resolve({}) }));

    expect(getPublicBoardPage).toHaveBeenCalledWith({
      q: '',
      sort: 'latest',
      lang: 'all',
      type: 'all',
      page: 1,
    });
    expect(screen.getByTestId('guest-board')).toBeInTheDocument();
    expect(received?.initial?.data).toEqual(DATA);
    expect(received?.initial?.state.page).toBe(1);
  });

  it('reads the URL state, so a shared link renders the same view', async () => {
    render(
      await PublicThreadsBoardPage({
        searchParams: Promise.resolve({
          q: 'rag',
          sort: 'liked',
          lang: 'ar',
          type: 'guide',
          page: '2',
        }),
      }),
    );

    expect(getPublicBoardPage).toHaveBeenCalledWith({
      q: 'rag',
      sort: 'liked',
      lang: 'ar',
      type: 'guide',
      page: 2,
    });
  });

  it('falls back to a client load, not an empty Board, when the server could not load it', async () => {
    getPublicBoardPage.mockResolvedValue(null);

    render(await PublicThreadsBoardPage({ searchParams: Promise.resolve({}) }));

    expect(received?.initial).toBeUndefined();
    expect(screen.getByTestId('guest-board')).toBeInTheDocument();
  });

  it('describes the page for search engines with links to every listed Thread', async () => {
    const { container } = render(
      await PublicThreadsBoardPage({ searchParams: Promise.resolve({}) }),
    );

    const script = container.querySelector('script#threads-board-jsonld');
    const json: unknown = JSON.parse(script?.textContent ?? '{}');
    expect(json).toMatchObject({
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: 'Board title',
          description: 'Board description',
          url: 'https://claw.example/de/threads/board',
          inLanguage: 'de',
          dateModified: '2026-10-14',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: 1,
            itemListElement: [
              { position: 1, url: 'https://claw.example/ar/threads/alpha', name: 'Alpha' },
            ],
          },
        },
        { '@type': 'BreadcrumbList' },
      ],
    });
  });

  it('indexes the plain Board and first page', async () => {
    expect(await generateMetadata({ searchParams: Promise.resolve({}) })).toMatchObject({
      robots: { index: true, follow: true },
    });
    expect(await generateMetadata({ searchParams: Promise.resolve({ page: '1' }) })).toMatchObject({
      robots: { index: true },
    });
    expect(buildMetadata).toHaveBeenCalledWith('threads/board');
  });

  it.each([{ q: 'rag' }, { lang: 'ar' }, { type: 'guide' }, { sort: 'liked' }, { page: '2' }])(
    'keeps a filtered or later page out of the index but follows its links: %o',
    async (params) => {
      expect(await generateMetadata({ searchParams: Promise.resolve(params) })).toMatchObject({
        robots: { index: false, follow: true },
      });
    },
  );
});

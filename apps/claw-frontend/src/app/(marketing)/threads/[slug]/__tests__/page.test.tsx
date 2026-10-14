import { ThreadPublicationType } from '@claw/shared-types';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { getPublicThreadPublication } from '@/lib/threads/public-thread-api';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

import PublicThreadPublicationPage, { generateMetadata } from '../page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('../page-client', () => ({ ThreadPublicPageClient: () => <div data-testid="client" /> }));
vi.mock('@/lib/threads/public-thread-api', () => ({ getPublicThreadPublication: vi.fn() }));
vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: () => 'https://claw-ai.co',
  isProductionCanonical: () => true,
  shouldNoIndexEverything: () => false,
}));

const ARABIC = 'كيف-يعمل-التمثيل-a1b2c3d4';

const PUBLICATION: PublicThreadPublication = {
  slug: ARABIC,
  title: 'كيف يعمل التمثيل الضوئي',
  contentLocale: Locale.AR,
  publicationType: ThreadPublicationType.ARTICLE,
  content: { markdown: '# T\n\nbody', citations: [] },
  publishedAt: '2026-10-13T00:00:00.000Z',
  viewCount: 1,
  readerCount: 0,
};

function params(slug: string): Promise<{ slug: string }> {
  return Promise.resolve({ slug });
}

describe('public Thread page route parameter', () => {
  beforeEach(() => {
    vi.mocked(getPublicThreadPublication).mockReset();
    vi.mocked(getPublicThreadPublication).mockResolvedValue(PUBLICATION);
  });

  it('decodes the percent-encoded segment before asking the API', async () => {
    await PublicThreadPublicationPage({ params: params(encodeURIComponent(ARABIC)) });
    expect(getPublicThreadPublication).toHaveBeenCalledWith(ARABIC);
  });

  it('renders the page for an Arabic slug instead of a 404', async () => {
    const element = await PublicThreadPublicationPage({
      params: params(encodeURIComponent(ARABIC)),
    });
    expect(render(element).getByTestId('client')).toBeTruthy();
  });

  it('answers not found, without calling the API, for malformed encoding', async () => {
    await expect(PublicThreadPublicationPage({ params: params('%E0%A4%A') })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(getPublicThreadPublication).not.toHaveBeenCalled();
  });

  it('answers not found when the API has no such publication', async () => {
    vi.mocked(getPublicThreadPublication).mockResolvedValue(null);
    await expect(PublicThreadPublicationPage({ params: params('missing-slug') })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('advertises one encoded canonical and the same address in hreflang and Open Graph', async () => {
    const metadata = await generateMetadata({ params: params(encodeURIComponent(ARABIC)) });
    const canonical = `https://claw-ai.co/ar/threads/${encodeURIComponent(ARABIC)}`;
    expect(metadata.alternates?.canonical).toBe(canonical);
    expect(metadata.alternates?.languages).toEqual({ ar: canonical, 'x-default': canonical });
    expect(metadata.openGraph?.url).toBe(canonical);
    expect(metadata.title).toBe(PUBLICATION.title);
  });

  it('keeps the content-language canonical when the Thread is opened under another app locale', async () => {
    // /en/threads/<arabic slug>: the page only sees the slug, so the canonical and hreflang
    // never follow the interface locale; the all-threads sitemap URLs are discovery aids.
    const metadata = await generateMetadata({ params: params(encodeURIComponent(ARABIC)) });
    expect(metadata.alternates?.canonical).toContain('/ar/threads/');
    expect(metadata.alternates?.canonical).not.toContain('/en/threads/');
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it('marks an unknown slug noindex', async () => {
    vi.mocked(getPublicThreadPublication).mockResolvedValue(null);
    const metadata = await generateMetadata({ params: params('nope') });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

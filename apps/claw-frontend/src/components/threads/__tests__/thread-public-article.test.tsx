import { ThreadPublicationType } from '@claw/shared-types';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

import { ThreadPublicArticle } from '../thread-public-article';

vi.mock('@/components/threads/thread-reader-body', () => ({
  ThreadReaderBody: () => <div />,
}));

function publication(contentLocale: Locale): PublicThreadPublication {
  return {
    slug: 's',
    title: 'T',
    contentLocale,
    publicationType: ThreadPublicationType.ARTICLE,
    content: { markdown: 'x', citations: [] },
    publishedAt: '2026-10-14T00:00:00.000Z',
    viewCount: 0,
    readerCount: 0,
  };
}

function renderArticle(contentLocale: Locale): HTMLElement {
  const { container } = render(
    <ThreadPublicArticle
      publication={publication(contentLocale)}
      truncatedLabel=""
      citationsLabel=""
      publishedLabel=""
      viewsLabel=""
    />,
  );
  const article = container.querySelector('article');
  if (article === null) {
    throw new Error('no article');
  }
  return article;
}

describe('ThreadPublicArticle', () => {
  it('carries the Thread language and direction, not the page locale', () => {
    const arabic = renderArticle(Locale.AR);
    expect(arabic).toHaveAttribute('dir', 'rtl');
    expect(arabic).toHaveAttribute('lang', 'ar');
    expect(renderArticle(Locale.EN)).toHaveAttribute('dir', 'ltr');
  });
});

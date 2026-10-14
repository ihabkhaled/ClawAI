import { ThreadPublicationType } from '@claw/shared-types';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import { getDictionary } from '@/lib/i18n/translations';
import type { ThreadBoardItem } from '@/types/thread-board.types';

import { BoardCard } from '../board-card';
import { BoardEmpty } from '../board-empty';
import { BoardError } from '../board-error';
import { BoardSuggestionRow } from '../board-suggestion-row';

let locale: Locale = Locale.EN;

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      resolveTranslation(getDictionary(locale), key, params),
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const item: ThreadBoardItem = {
  slug: 'a',
  title: 'Title',
  excerpt: 'Excerpt',
  contentLocale: 'en',
  publicationType: ThreadPublicationType.ARTICLE,
  publishedAt: '2026-10-01T00:00:00Z',
  readingMinutes: 4,
  sourceCount: 2,
  likeCount: 5,
  commentCount: 1,
  viewCount: 9,
  viewerReaction: null,
};

describe.each(Object.values(Locale))('board copy in %s', (current) => {
  it('leaves no unreplaced {placeholder} in the card, empty, error and suggestion states', () => {
    locale = current;
    const { container } = render(
      <>
        <BoardCard item={item} />
        <BoardEmpty query="vectr" hasQuery hasActiveFilters={false} onClear={() => undefined} />
        <BoardError onRetry={() => undefined} rateLimit={{ retryAfterSeconds: 54 }} />
        <BoardError onRetry={() => undefined} rateLimit={{ retryAfterSeconds: null }} />
        <BoardSuggestionRow
          id="s"
          query="vectr"
          active={false}
          onSelect={() => undefined}
          onHover={() => undefined}
          suggestion={{
            slug: 'a',
            title: 'Vector',
            publicationType: ThreadPublicationType.ARTICLE,
            contentLocale: 'en',
            publishedAt: '2026-10-01T00:00:00Z',
            match: [],
          }}
        />
      </>,
    );
    expect(container.textContent).not.toMatch(/[{}]/u);
    expect(container.textContent).not.toContain('chat.threadBoard');
    expect(container.querySelector('mark')?.textContent).toBe('Vector');
  });
});

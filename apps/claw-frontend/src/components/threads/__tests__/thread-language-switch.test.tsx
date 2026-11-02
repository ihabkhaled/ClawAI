import { ThreadPublicationType } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadLanguageSwitch } from '@/components/threads/thread-language-switch';
import { Locale } from '@/enums/locale.enum';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

const replace = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${params['language'] ?? ''}` : key,
  }),
}));

function publication(overrides: Partial<PublicThreadPublication>): PublicThreadPublication {
  return {
    slug: 'sky-a1b2c3d4',
    title: 'T',
    contentLocale: Locale.EN,
    publicationType: ThreadPublicationType.ARTICLE,
    content: { markdown: '# T', citations: [] },
    publishedAt: '2026-11-02T00:00:00.000Z',
    viewCount: 1,
    readerCount: 0,
    sourceLocale: Locale.EN,
    translated: false,
    availableLocales: [Locale.EN, Locale.AR, Locale.DE],
    ...overrides,
  };
}

describe('ThreadLanguageSwitch', () => {
  beforeEach(() => {
    replace.mockReset();
    window.history.replaceState({}, '', '/en/threads/sky-a1b2c3d4');
  });

  it('offers only the languages that have a copy, in their own names', () => {
    render(<ThreadLanguageSwitch publication={publication({})} />);

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['English', 'العربية', 'Deutsch']);
  });

  it('changes ?lang only, so the app language in the path is untouched', () => {
    render(<ThreadLanguageSwitch publication={publication({})} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ar' } });

    expect(replace).toHaveBeenCalledWith('/en/threads/sky-a1b2c3d4?lang=ar', { scroll: false });
  });

  it('drops ?lang when the written language is chosen again', () => {
    window.history.replaceState({}, '', '/en/threads/sky-a1b2c3d4?lang=ar');
    render(
      <ThreadLanguageSwitch
        publication={publication({ contentLocale: Locale.AR, translated: true })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'threadTranslation.showOriginal' }));

    expect(replace).toHaveBeenCalledWith('/en/threads/sky-a1b2c3d4', { scroll: false });
    expect(screen.getByText(/threadTranslation.translatedNotice:English/u)).toBeTruthy();
  });

  it('renders nothing when the Thread has no translation yet', () => {
    const { container } = render(
      <ThreadLanguageSwitch publication={publication({ availableLocales: [Locale.EN] })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

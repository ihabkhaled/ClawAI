import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadsBoardCtaSection } from '../threads-board-cta-section';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'fr' }),
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('ThreadsBoardCtaSection', () => {
  it('invites a visitor to the public Board in their language, with a heading and a body', () => {
    render(<ThreadsBoardCtaSection />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'chat.threadBoardGuestHomeTitle' }),
    ).toBeInTheDocument();
    expect(screen.getByText('chat.threadBoardGuestHomeBody')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.threadBoardGuestHomeCta' })).toHaveAttribute(
      'href',
      '/fr/threads/board',
    );
  });

  it('is a labelled landmark region', () => {
    render(<ThreadsBoardCtaSection />);

    expect(
      screen.getByRole('region', { name: 'chat.threadBoardGuestHomeTitle' }),
    ).toBeInTheDocument();
  });
});

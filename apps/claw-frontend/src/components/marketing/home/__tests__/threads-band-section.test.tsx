import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadsBandSection } from '@/components/marketing/home/threads-band-section';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ThreadsBandSection', () => {
  it('renders the explainer it is given, between the intro and the steps', () => {
    render(<ThreadsBandSection video={<figure data-testid="explainer">video</figure>} />);

    const explainer = screen.getByTestId('explainer');
    const heading = screen.getByRole('heading', { level: 2 });
    const steps = screen.getByRole('list');

    expect(
      heading.compareDocumentPosition(explainer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      explainer.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders without an explainer', () => {
    render(<ThreadsBandSection />);

    expect(screen.queryByTestId('explainer')).toBeNull();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});

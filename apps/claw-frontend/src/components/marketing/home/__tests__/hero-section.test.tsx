import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HeroSection } from '@/components/marketing/home/hero-section';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  default: () => <span data-testid="hero-image" />,
}));
vi.mock('@/hooks/common/use-localized-href', () => ({
  useLocalizedHref: () => (path: string) => `/ar${path}`,
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('HeroSection', () => {
  it('shows the Public Threads entry right under the logo, ahead of the headline', () => {
    render(<HeroSection lastReviewed="2026-11-02" />);

    const promo = screen.getByTestId('home-threads-promo');
    const headline = screen.getByRole('heading', { level: 1 });

    expect(promo).toHaveAttribute('href', '/ar/threads/discover');
    expect(promo).toHaveTextContent('threadTranslation.promoTitle');
    expect(promo).toHaveTextContent('threadTranslation.promoCta');
    expect(promo.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

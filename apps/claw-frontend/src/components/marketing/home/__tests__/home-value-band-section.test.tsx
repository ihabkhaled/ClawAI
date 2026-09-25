import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeValueBandSection } from '@/components/marketing/home/home-value-band-section';
import {
  MARKETING_HOME_PAYG_BAND,
  MARKETING_HOME_TEAMS_BAND,
} from '@/constants/marketing-home.constants';
import { getPublishedPages } from '@/utilities/content-registry.utility';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('HomeValueBandSection', () => {
  it.each([MARKETING_HOME_PAYG_BAND, MARKETING_HOME_TEAMS_BAND])(
    'renders the $id band: one h2, three points and two links',
    (band) => {
      render(<HomeValueBandSection band={band} />);
      expect(screen.getByRole('heading', { level: 2, name: band.titleKey })).toBeInTheDocument();
      for (const point of band.points) {
        expect(screen.getByText(point.titleKey)).toBeInTheDocument();
        expect(screen.getByText(point.bodyKey)).toBeInTheDocument();
      }
      expect(screen.getByRole('link', { name: band.primaryLink.labelKey })).toHaveAttribute(
        'href',
        band.primaryLink.href,
      );
      expect(screen.getByRole('link', { name: band.secondaryLink.labelKey })).toHaveAttribute(
        'href',
        band.secondaryLink.href,
      );
    },
  );

  it('links only to PUBLISHED registry pages', () => {
    const published = new Set(getPublishedPages().map((page) => page.canonicalPath));
    for (const band of [MARKETING_HOME_PAYG_BAND, MARKETING_HOME_TEAMS_BAND]) {
      expect(published.has(band.primaryLink.href), band.primaryLink.href).toBe(true);
      expect(published.has(band.secondaryLink.href), band.secondaryLink.href).toBe(true);
    }
  });
});

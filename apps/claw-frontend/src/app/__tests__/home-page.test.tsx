import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage, { generateMetadata } from '@/app/(marketing)/page';
import { LocaleProvider } from '@/lib/i18n';

// The homepage sections are client components that read copy via
// useTranslation, so they must render inside a LocaleProvider. With the
// default locale (en) the real i18n resolver returns the English source
// strings the assertions below check.
function renderHome(): void {
  render(
    <LocaleProvider>
      <HomePage />
    </LocaleProvider>,
  );
}

describe('HomePage', () => {
  it('renders exactly one h1', () => {
    renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders primary CTAs to /chat and /login', () => {
    renderHome();
    const openClawLinks = screen.getAllByRole('link', { name: 'Open Claw' });
    expect(openClawLinks.length).toBeGreaterThan(0);
    for (const link of openClawLinks) {
      expect(link).toHaveAttribute('href', '/chat');
    }
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('renders the last-reviewed date from the content registry', () => {
    renderHome();
    expect(screen.getByText(/Last reviewed 2026-07-24/)).toBeInTheDocument();
  });
});

describe('HomePage generateMetadata', () => {
  it('returns the registry title/description and a canonical URL', async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toContain('ClawAI');
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toMatch(/\/$/);
  });
});

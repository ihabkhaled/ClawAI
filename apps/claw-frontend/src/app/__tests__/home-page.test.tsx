import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomePage, { generateMetadata } from '@/app/(marketing)/page';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { en } from '@/lib/i18n/locales/en';
import { getPageBySlug } from '@/utilities/content-registry.utility';

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': Locale.EN }),
}));

vi.mock('@/lib/pricing/public-pricing-api', () => ({
  fetchPublicPricingCatalog: async () => [],
}));

// The homepage sections are client components that read copy via
// useTranslation, so they must render inside a LocaleProvider. Assertions
// target hrefs and structure rather than English copy — the marketing copy
// lives in the locale files and is expected to be reworded independently of
// this test.
async function renderHome(): Promise<void> {
  const page = await HomePage();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
        {page}
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function hrefsOnPage(): string[] {
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href !== '');
}

describe('HomePage', () => {
  it('renders exactly one h1', async () => {
    await renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('routes the primary conversion path to sign-up and sign-in', async () => {
    await renderHome();
    const hrefs = hrefsOnPage();
    expect(hrefs).toContain('/register');
    expect(hrefs).toContain('/login');
  });

  it('links out to the dedicated topic pages instead of inlining them', async () => {
    await renderHome();
    const hrefs = hrefsOnPage();
    for (const path of ['/features', '/how-it-works', '/architecture', '/faq', '/use-cases']) {
      expect(hrefs).toContain(path);
    }
  });

  it('offers the on-premise deployment only as an organisation contact path', async () => {
    await renderHome();
    const hrefs = hrefsOnPage();
    expect(hrefs).toContain('/contact');
    expect(hrefs).toContain('/local-first-ai');
  });

  it('renders the last-reviewed date from the content registry', async () => {
    await renderHome();
    const lastReviewed = getPageBySlug('home')?.lastReviewed ?? '';
    expect(lastReviewed).not.toBe('');
    expect(document.body.textContent).toContain(lastReviewed);
  });
});

describe('HomePage generateMetadata', () => {
  it('returns the registry title/description and a canonical URL', async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toContain('ClawAI');
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toMatch(/\/en$/);
  });
});

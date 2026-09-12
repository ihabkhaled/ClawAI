import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublicLaunchPage } from '@/components/marketing/shared/public-launch-page';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';

vi.mock('@/components/adsense/marketing-ad-unit', () => ({
  MarketingAdUnit: ({ slot }: { slot: string | null }) => (
    <aside data-testid="marketing-ad-unit" data-slot={slot ?? ''} />
  ),
}));

vi.mock('@/lib/adsense/adsense-config', () => ({
  getAdSenseSlots: () => ({ content: '2345678901' }),
}));

const catalogResult: { value: unknown } = { value: null };

vi.mock('@/lib/models/public-models-api', () => ({
  fetchPublicModelCatalog: () => Promise.resolve(catalogResult.value),
}));

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': 'en' }),
}));

describe('PublicLaunchPage', () => {
  it('renders a structured trust page with one h1, local navigation, and evidence', async () => {
    render(await PublicLaunchPage({ slug: PublicLaunchPageSlug.SECURITY_AND_PRIVACY }));

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(4);
    expect(
      screen.getByRole('complementary', { name: 'Repository-backed note' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2026-07-27/)).toBeInTheDocument();
  });

  // Replaces a test that asserted a seven-name hardcoded list. That list
  // included DeepSeek, xAI Grok and llama.cpp, which have no connected models
  // here — the page promised three vendors a visitor could not reach.
  it('names the provider families the live catalog reports', async () => {
    catalogResult.value = {
      providers: [
        { provider: 'OPENAI', displayName: 'OpenAI', modelCount: 2, models: [] },
        { provider: 'ANTHROPIC', displayName: 'Anthropic', modelCount: 1, models: [] },
      ],
      totalModelCount: 3,
      providerCount: 2,
      generatedAt: '2026-09-12T00:00:00.000Z',
    };

    render(await PublicLaunchPage({ slug: PublicLaunchPageSlug.SUPPORTED_MODELS }));

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    // Not connected here, so it must not be named.
    expect(screen.queryByText('xAI Grok')).not.toBeInTheDocument();
    expect(screen.getByText(/exact catalog depends/i)).toBeInTheDocument();
  });

  it('omits the provider section entirely when the catalog is unavailable', async () => {
    catalogResult.value = null;

    render(await PublicLaunchPage({ slug: PublicLaunchPageSlug.SUPPORTED_MODELS }));

    expect(screen.queryByText('OpenAI')).not.toBeInTheDocument();
    // The rest of the page still renders — an outage degrades it, not deletes it.
    expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
  });

  it('wires the configured content AdSense slot into editorial pages', async () => {
    render(await PublicLaunchPage({ slug: PublicLaunchPageSlug.SECURITY_AND_PRIVACY }));

    expect(screen.getByTestId('marketing-ad-unit')).toHaveAttribute('data-slot', '2345678901');
  });
});

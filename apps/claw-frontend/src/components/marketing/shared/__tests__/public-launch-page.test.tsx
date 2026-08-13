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

  it('names only implemented provider families and explains live availability', async () => {
    render(await PublicLaunchPage({ slug: PublicLaunchPageSlug.SUPPORTED_MODELS }));

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Ollama')).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: /Bedrock/i })).not.toBeInTheDocument();
    expect(screen.getByText(/exact catalog depends/i)).toBeInTheDocument();
  });

  it('wires the configured content AdSense slot into editorial pages', async () => {
    render(await PublicLaunchPage({ slug: PublicLaunchPageSlug.SECURITY_AND_PRIVACY }));

    expect(screen.getByTestId('marketing-ad-unit')).toHaveAttribute('data-slot', '2345678901');
  });
});

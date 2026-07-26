import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanTierCard } from '@/components/marketing/home/plan-tier-card';
import type { MarketingPlanTier } from '@/types/subscription-marketing.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const TIER: MarketingPlanTier = {
  slug: 'pro',
  nameKey: 'plan.name',
  taglineKey: 'plan.tagline',
  monthlyUsd: 20,
  yearlyUsd: 200,
  dailyTokens: '250K',
  monthlyTokens: '4M',
  highlightKeys: ['plan.highlight'],
  isFeatured: true,
};

describe('PlanTierCard', () => {
  it('preserves the selected plan and monthly interval through registration', () => {
    render(<PlanTierCard tier={TIER} isYearly={false} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?plan=pro&interval=monthly');
  });

  it('preserves the selected plan and yearly interval through registration', () => {
    render(<PlanTierCard tier={TIER} isYearly />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?plan=pro&interval=yearly');
  });
});

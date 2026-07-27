import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanTierCard } from '@/components/marketing/home/plan-tier-card';
import { BillingInterval } from '@/enums/billing.enum';
import type { PublicPlan } from '@/types/public-pricing.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

const PLAN: PublicPlan = {
  id: 'plan-pro',
  slug: 'pro',
  name: 'Pro',
  description: 'Professional plan',
  displayOrder: 1,
  isDefault: true,
  dailyTokenQuota: 250_000,
  weeklyTokenQuota: null,
  monthlyTokenQuota: 4_000_000,
  maxChatsPerDay: null,
  maxMessagesPerDay: null,
  maxWorkspaceConnections: null,
  maxContextPacks: null,
  maxMemoryItems: null,
  prices: [
    {
      id: 'price-monthly',
      planId: 'plan-pro',
      billingInterval: BillingInterval.MONTHLY,
      currency: 'USD',
      amountMinor: 2_000,
      version: 1,
      isActive: true,
    },
    {
      id: 'price-yearly',
      planId: 'plan-pro',
      billingInterval: BillingInterval.YEARLY,
      currency: 'USD',
      amountMinor: 20_000,
      version: 1,
      isActive: true,
    },
  ],
  features: [],
};

describe('PlanTierCard', () => {
  it('preserves the selected plan and monthly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} isYearly={false} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?plan=pro&interval=monthly');
  });

  it('preserves the selected plan and yearly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} isYearly />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?plan=pro&interval=yearly');
  });
});

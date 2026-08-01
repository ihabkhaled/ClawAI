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
  it('keeps every card and call to action at stable dimensions while long copy scrolls', () => {
    render(
      <PlanTierCard
        plan={{ ...PLAN, description: 'A very long plan description. '.repeat(40) }}
        isYearly={false}
      />,
    );

    expect(screen.getByRole('article')).toHaveClass('h-full', 'min-h-[22rem]');
    expect(screen.getByTestId('plan-copy-scroll')).toHaveClass(
      'h-24',
      'overflow-y-auto',
      'overscroll-contain',
    );
    expect(screen.getByRole('link')).toHaveClass('mt-auto', 'h-12', 'shrink-0', 'cursor-pointer');
    expect(screen.getByRole('link')).not.toHaveClass('flex-1');
  });

  it('preserves the selected plan and monthly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} isYearly={false} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?plan=pro&interval=monthly');
  });

  it('preserves the selected plan and yearly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} isYearly />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?plan=pro&interval=yearly');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanTierCard } from '@/components/marketing/home/plan-tier-card';
import { DISABLED_PLAN_FEATURE_GATES } from '@/constants';
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
  featureGates: {
    ...DISABLED_PLAN_FEATURE_GATES,
    allowConsensusMode: true,
    allowRolePack: true,
  },
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
  it('shows every token and resource limit on the public plan', () => {
    render(<PlanTierCard plan={{ ...PLAN, weeklyTokenQuota: 20_000 }} isYearly={false} />);

    expect(screen.getByText('adminPlans.form.weeklyTokenQuota')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.form.maxChatsPerDay')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.form.maxMessagesPerDay')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.form.maxWorkspaceConnections')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.form.maxContextPacks')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.form.maxMemoryItems')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.gate.allowConsensusMode')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.gate.allowRolePack')).toBeInTheDocument();
  });

  it('keeps every card and call to action at stable dimensions while long copy scrolls', () => {
    render(
      <PlanTierCard
        plan={{ ...PLAN, description: 'A very long plan description. '.repeat(40) }}
        isYearly={false}
      />,
    );

    expect(screen.getByRole('article')).toHaveClass('h-full', 'min-h-[22rem]');
    expect(screen.getByRole('heading', { level: 2, name: 'Pro' })).toBeInTheDocument();
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

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dmonthly',
    );
  });

  it('preserves the selected plan and yearly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} isYearly />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dyearly',
    );
  });

  it('sends a free signup to chat instead of opening a rejected zero-value checkout', () => {
    const freePlan: PublicPlan = {
      ...PLAN,
      prices: PLAN.prices.map((price) => ({ ...price, amountMinor: 0 })),
    };

    render(<PlanTierCard plan={freePlan} isYearly={false} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?returnTo=%2Fchat');
  });
});

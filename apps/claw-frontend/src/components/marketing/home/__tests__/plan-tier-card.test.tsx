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
  isPopular: false,
  dailyTokenQuota: 250_000,
  weeklyTokenQuota: null,
  monthlyTokenQuota: 4_000_000,
  paygCreditPercentBps: 3000,
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
    render(
      <PlanTierCard
        plan={{ ...PLAN, weeklyTokenQuota: 20_000 }}
        interval={BillingInterval.MONTHLY}
      />,
    );

    expect(screen.getByText('userPlan.dailyLimitLabel')).toBeInTheDocument();
    expect(screen.getByText('adminPlans.form.weeklyTokenQuota')).toBeInTheDocument();
    expect(screen.getByText('userPlan.monthlyLimitLabel')).toBeInTheDocument();
    expect(screen.getByText('userPlan.chatsLimitLabel')).toBeInTheDocument();
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
        interval={BillingInterval.MONTHLY}
      />,
    );

    expect(screen.getByRole('article')).toHaveClass('h-full', 'min-h-[22rem]');
    expect(screen.getByRole('heading', { level: 2, name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByTestId('plan-copy-scroll')).toHaveClass(
      'h-24',
      'overflow-y-auto',
      'overscroll-contain',
    );
    expect(screen.getByRole('link')).toHaveClass('h-12', 'w-full', 'cursor-pointer');
    expect(screen.getByRole('link')).not.toHaveClass('flex-1');
    expect(screen.getByRole('link').parentElement).toHaveClass('mt-auto', 'shrink-0');
  });

  // `mt-auto` only separates the call to action when the card has space to
  // spare. A plan carrying all sixteen feature gates has none, so the margin
  // collapsed and the button sat flush against the last feature row.
  it('keeps the call to action clear of the feature list on a full card', () => {
    render(<PlanTierCard plan={PLAN} interval={BillingInterval.MONTHLY} />);

    // The rule matters as much as the padding: after sixteen tightly stacked
    // feature rows, spacing alone did not read as a break.
    expect(screen.getByRole('link').parentElement).toHaveClass('pt-6', 'border-t');
  });

  it('preserves the selected plan and monthly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} interval={BillingInterval.MONTHLY} />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dmonthly',
    );
  });

  it('preserves the selected plan and yearly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} interval={BillingInterval.YEARLY} />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dyearly',
    );
  });

  it('preserves the selected plan and quarterly interval through registration', () => {
    render(<PlanTierCard plan={PLAN} interval={BillingInterval.QUARTERLY} />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fbilling%2Fcheckout%3Fplan%3Dpro%26interval%3Dquarterly',
    );
  });

  it('shows a discount badge for QUARTERLY and SEMIANNUAL but not MONTHLY or YEARLY', () => {
    const planWithQuarterly: PublicPlan = {
      ...PLAN,
      prices: [
        ...PLAN.prices,
        {
          id: 'price-quarterly',
          planId: 'plan-pro',
          billingInterval: BillingInterval.QUARTERLY,
          currency: 'USD',
          amountMinor: 5_400,
          version: 1,
          isActive: true,
        },
        {
          id: 'price-semiannual',
          planId: 'plan-pro',
          billingInterval: BillingInterval.SEMIANNUAL,
          currency: 'USD',
          amountMinor: 10_200,
          version: 1,
          isActive: true,
        },
      ],
    };

    const { rerender } = render(
      <PlanTierCard plan={planWithQuarterly} interval={BillingInterval.MONTHLY} />,
    );
    expect(screen.queryByText('marketing.pricing.discountBadge')).not.toBeInTheDocument();

    rerender(<PlanTierCard plan={planWithQuarterly} interval={BillingInterval.YEARLY} />);
    expect(screen.queryByText('marketing.pricing.discountBadge')).not.toBeInTheDocument();

    rerender(<PlanTierCard plan={planWithQuarterly} interval={BillingInterval.QUARTERLY} />);
    expect(screen.getByText('marketing.pricing.discountBadge')).toBeInTheDocument();

    rerender(<PlanTierCard plan={planWithQuarterly} interval={BillingInterval.SEMIANNUAL} />);
    expect(screen.getByText('marketing.pricing.discountBadge')).toBeInTheDocument();
  });

  it('sends a free signup to chat instead of opening a rejected zero-value checkout', () => {
    const freePlan: PublicPlan = {
      ...PLAN,
      prices: PLAN.prices.map((price) => ({ ...price, amountMinor: 0 })),
    };

    render(<PlanTierCard plan={freePlan} interval={BillingInterval.MONTHLY} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/register?returnTo=%2Fchat');
  });
});

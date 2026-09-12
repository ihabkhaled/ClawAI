import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PricingSection } from '@/components/marketing/home/pricing-section';
import { BillingInterval } from '@/enums/billing.enum';

const mockController = vi.fn();
const retry = vi.fn();

vi.mock('@/hooks/marketing/use-public-pricing', () => ({
  usePublicPricing: () => mockController(),
}));

vi.mock('@/components/marketing/home/plan-tier-card', () => ({
  PlanTierCard: ({ plan }: { plan: { name: string } }) => <article>{plan.name}</article>,
}));

function controller(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    plans: [],
    isLoading: false,
    isError: false,
    error: null,
    interval: BillingInterval.MONTHLY,
    selectInterval: vi.fn(),
    retry,
    t: (key: string) => key,
    locale: 'en',
    ...overrides,
  };
}

describe('PricingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state', () => {
    mockController.mockReturnValue(controller({ isLoading: true }));
    render(<PricingSection initialPlans={null} />);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('renders an actionable error state', () => {
    mockController.mockReturnValue(controller({ isError: true }));
    render(<PricingSection initialPlans={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(screen.getByRole('alert')).toHaveTextContent('billing.plans.error');
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders the empty state', () => {
    mockController.mockReturnValue(controller());
    render(<PricingSection initialPlans={[]} />);
    expect(screen.getByText('billing.plans.empty')).toBeInTheDocument();
  });

  it('renders plans returned by the live catalog', () => {
    mockController.mockReturnValue(
      controller({
        plans: [
          {
            id: 'plan-pro',
            slug: 'pro',
            name: 'Pro',
            prices: [],
            features: [],
          },
        ],
      }),
    );
    render(<PricingSection initialPlans={[]} />);
    expect(screen.getByRole('article')).toHaveTextContent('Pro');
    expect(screen.queryByText('billing.plans.empty')).not.toBeInTheDocument();
  });

  // Replaces the old "temporary fallback prices" test. There is no fallback any
  // more: a catalog we could not read shows an error and a retry, never seven
  // invented prices under a mild disclaimer.
  it('shows an error with a retry instead of prices it cannot vouch for', () => {
    mockController.mockReturnValue(controller({ isError: true, plans: [] }));

    render(<PricingSection initialPlans={null} />);

    expect(screen.getByRole('alert')).toHaveTextContent('billing.plans.error');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('distinguishes a genuinely empty catalog from a failure', () => {
    mockController.mockReturnValue(controller({ isError: false, plans: [] }));

    render(<PricingSection initialPlans={[]} />);

    expect(screen.getByText('billing.plans.empty')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

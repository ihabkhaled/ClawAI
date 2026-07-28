import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BillingPage from '@/app/(portal)/billing/page';
import { BillingGateway, BillingInterval, SubscriptionStatus } from '@/enums/billing.enum';
import type { UseBillingPageReturn } from '@/types/billing-hook.types';
import type { BillingPlan, CurrentSubscription } from '@/types/billing.types';

const mockHook = vi.fn();

vi.mock('@/hooks/billing/use-billing-page', () => ({
  useBillingPage: () => mockHook(),
}));

const plan: BillingPlan = {
  id: 'plan-pro',
  slug: 'pro',
  name: 'Pro',
  description: 'For daily use',
  displayOrder: 2,
  isDefault: false,
  prices: [
    {
      billingInterval: BillingInterval.MONTHLY,
      currency: 'USD',
      amountMinor: 1999,
      planPriceVersionId: 'v1',
    },
  ],
  dailyTokenQuota: 100000,
  weeklyTokenQuota: null,
  monthlyTokenQuota: null,
  maxChatsPerDay: 50,
  maxMessagesPerDay: null,
  maxWorkspaceConnections: null,
  maxContextPacks: null,
  maxMemoryItems: null,
  features: [],
};

const subscription: CurrentSubscription = {
  id: 'sub-1',
  planId: 'plan-pro',
  planSlug: 'pro',
  planName: 'Pro',
  status: SubscriptionStatus.ACTIVE,
  billingInterval: BillingInterval.MONTHLY,
  currency: 'USD',
  amountMinor: 1999,
  currentPeriodStart: '2026-07-01T00:00:00.000Z',
  currentPeriodEnd: '2026-08-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  gracePeriodEndsAt: null,
  scheduledPlanSlug: null,
  scheduledEffectiveAt: null,
};

function baseHook(overrides: Partial<UseBillingPageReturn> = {}): UseBillingPageReturn {
  return {
    t: (key: string) => key,
    subscription: { subscription: null, isLoading: false, isError: false },
    usage: { usage: null, isLoading: false, isError: false },
    invoices: { invoices: [], isLoading: false, isError: false },
    paymentMethods: {
      methods: [],
      isLoading: false,
      isError: false,
      startSetup: vi.fn(),
      isSetupPending: false,
      remove: vi.fn(),
      pendingId: null,
      error: null,
      clearError: vi.fn(),
      gatewaySession: null,
      closeGateway: vi.fn(),
      completeGateway: vi.fn(),
    },
    planChange: {
      quote: null,
      requestQuote: vi.fn(),
      confirmChange: vi.fn(),
      isQuoting: false,
      isConfirming: false,
      error: null,
      clearError: vi.fn(),
      reset: vi.fn(),
      gatewaySession: null,
      closeGateway: vi.fn(),
      completeGateway: vi.fn(),
    },
    plans: { plans: [], isLoading: false, isError: false, error: null },
    checkout: {
      startCheckout: vi.fn(),
      isPending: false,
      error: null,
      clearError: vi.fn(),
      gatewaySession: null,
      closeGateway: vi.fn(),
      completeGateway: vi.fn(),
    },
    cancellation: {
      cancel: vi.fn(),
      resume: vi.fn(),
      isCancelPending: false,
      isResumePending: false,
      error: null,
      clearError: vi.fn(),
    },
    view: {
      interval: BillingInterval.MONTHLY,
      setInterval: vi.fn(),
      gateway: BillingGateway.PAYPAL,
      setGateway: vi.fn(),
      targetPlan: null,
      openPlanChange: vi.fn(),
      closePlanChange: vi.fn(),
      isCancelOpen: false,
      setIsCancelOpen: vi.fn(),
    },
    selectPlan: vi.fn(),
    confirmPlanSelection: vi.fn(),
    ...overrides,
  } as UseBillingPageReturn;
}

describe('BillingPage', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('renders the free state rather than an error when there is no subscription', () => {
    mockHook.mockReturnValue(baseHook());
    render(<BillingPage />);
    // A free user has no subscription row. That is the normal state for most
    // accounts and must never look like a failure.
    expect(screen.getByText('billing.summary.freeTitle')).toBeInTheDocument();
  });

  it('renders the empty plan state', () => {
    mockHook.mockReturnValue(baseHook());
    render(<BillingPage />);
    expect(screen.getByText('billing.plans.empty')).toBeInTheDocument();
  });

  it('renders the plan error state', () => {
    mockHook.mockReturnValue(
      baseHook({ plans: { plans: [], isLoading: false, isError: true, error: null } }),
    );
    render(<BillingPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('billing.plans.error');
  });

  it('shows the past-due banner with its grace date', () => {
    mockHook.mockReturnValue(
      baseHook({
        subscription: {
          subscription: {
            ...subscription,
            status: SubscriptionStatus.PAST_DUE,
            gracePeriodEndsAt: '2026-08-10T00:00:00.000Z',
          },
          isLoading: false,
          isError: false,
        },
      }),
    );
    render(<BillingPage />);
    expect(screen.getByText('billing.banner.pastDueTitle')).toBeInTheDocument();
  });

  it('surfaces a checkout failure as a dismissable banner', async () => {
    const clearError = vi.fn();
    mockHook.mockReturnValue(
      baseHook({
        checkout: {
          startCheckout: vi.fn(),
          isPending: false,
          error: 'boom',
          clearError,
          gatewaySession: null,
          closeGateway: vi.fn(),
          completeGateway: vi.fn(),
        },
      }),
    );
    render(<BillingPage />);
    expect(screen.getByText('boom')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'billing.error.dismiss' }));
    expect(clearError).toHaveBeenCalledOnce();
  });

  it('routes a plan selection through the controller, not straight to a charge', async () => {
    const selectPlan = vi.fn();
    mockHook.mockReturnValue(
      baseHook({
        plans: { plans: [plan], isLoading: false, isError: false, error: null },
        selectPlan,
      }),
    );
    render(<BillingPage />);

    await userEvent.click(screen.getByRole('button', { name: 'billing.plans.selectCta' }));
    expect(selectPlan).toHaveBeenCalledWith(plan);
  });

  it('hides selection for the current plan and exposes subscription cancellation', () => {
    mockHook.mockReturnValue(
      baseHook({
        plans: { plans: [plan], isLoading: false, isError: false, error: null },
        subscription: { subscription, isLoading: false, isError: false },
      }),
    );
    render(<BillingPage />);
    expect(
      screen.queryByRole('button', { name: 'billing.plans.currentCta' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'billing.actions.cancel' })).toBeEnabled();
  });
});

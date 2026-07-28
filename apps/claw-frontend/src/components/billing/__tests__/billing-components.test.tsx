import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BillingPlanCard } from '@/components/billing/billing-plan-card';
import { InvoiceTable } from '@/components/billing/invoice-table';
import { PaymentMethodList } from '@/components/billing/payment-method-list';
import { ProrationBreakdown } from '@/components/billing/proration-breakdown';
import { SubscriptionSummaryCard } from '@/components/billing/subscription-summary-card';
import { UsageWindowBar } from '@/components/billing/usage-window-bar';
import { BillingInterval, SubscriptionStatus } from '@/enums/billing.enum';
import type {
  BillingPlan,
  CurrentSubscription,
  InvoiceView,
  PaymentMethodView,
  ProrationQuoteView,
  UsageWindow,
} from '@/types/billing.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

function makeQuote(overrides: Partial<ProrationQuoteView> = {}): ProrationQuoteView {
  return {
    quoteId: 'q1',
    targetPlanSlug: 'pro',
    currency: 'USD',
    unusedCurrentCreditMinor: 500,
    targetRemainingChargeMinor: 1500,
    amountDueMinor: 1000,
    isScheduledForPeriodEnd: false,
    scheduledEffectiveAt: null,
    expiresAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePlan(amountMinor: number): BillingPlan {
  return {
    id: 'plan-1',
    slug: amountMinor === 0 ? 'free' : 'starter',
    name: amountMinor === 0 ? 'Free' : 'Starter',
    description: null,
    displayOrder: 1,
    isDefault: amountMinor === 0,
    prices: [
      {
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor,
        planPriceVersionId: 'price-1',
      },
    ],
    dailyTokenQuota: 300_000,
    weeklyTokenQuota: null,
    monthlyTokenQuota: null,
    maxChatsPerDay: 10,
    maxMessagesPerDay: 100,
    maxWorkspaceConnections: 0,
    maxContextPacks: 0,
    maxMemoryItems: 0,
    features: [],
  };
}

describe('BillingPlanCard', () => {
  it('does not offer checkout for a zero-cost plan', () => {
    render(
      <BillingPlanCard
        plan={makePlan(0)}
        interval={BillingInterval.MONTHLY}
        isCurrent={false}
        onSelect={vi.fn()}
        isPending={false}
        t={t}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render a plan-selection button for the current plan', () => {
    render(
      <BillingPlanCard
        plan={makePlan(500)}
        interval={BillingInterval.MONTHLY}
        isCurrent
        onSelect={vi.fn()}
        isPending={false}
        t={t}
      />,
    );

    expect(screen.getByText('billing.plans.current')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps a paid non-current plan selectable', async () => {
    const onSelect = vi.fn();
    const plan = makePlan(500);
    render(
      <BillingPlanCard
        plan={plan}
        interval={BillingInterval.MONTHLY}
        isCurrent={false}
        onSelect={onSelect}
        isPending={false}
        t={t}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'billing.plans.selectCta' }));
    expect(onSelect).toHaveBeenCalledWith(plan);
  });
});

describe('SubscriptionSummaryCard', () => {
  it('offers immediate removal beside resume after period-end cancellation', async () => {
    const onEndNow = vi.fn();
    const cancellingSubscription: CurrentSubscription = {
      id: 'subscription-1',
      planId: 'plan-1',
      planSlug: 'starter',
      planName: 'Starter',
      status: SubscriptionStatus.ACTIVE,
      billingInterval: BillingInterval.MONTHLY,
      currency: 'USD',
      amountMinor: 500,
      currentPeriodStart: '2026-07-01T00:00:00.000Z',
      currentPeriodEnd: '2026-08-01T00:00:00.000Z',
      cancelAtPeriodEnd: true,
      gracePeriodEndsAt: null,
      scheduledPlanSlug: null,
      scheduledEffectiveAt: null,
    };

    render(
      <SubscriptionSummaryCard
        subscription={cancellingSubscription}
        onCancel={vi.fn()}
        onResume={vi.fn()}
        onEndNow={onEndNow}
        isCancelPending={false}
        isResumePending={false}
        isEndNowPending={false}
        t={t}
      />,
    );

    expect(screen.getByRole('button', { name: 'billing.actions.resume' })).toBeEnabled();
    const removeButton = screen.getByRole('button', { name: 'billing.actions.remove' });
    expect(removeButton).toHaveClass('bg-destructive');
    await userEvent.click(removeButton);
    expect(onEndNow).toHaveBeenCalledOnce();
  });
});

describe('ProrationBreakdown', () => {
  it('shows credit and charge separately, not just the total', () => {
    // The user is about to be charged a number they did not pick. Showing only
    // the total is how an upgrade turns into a chargeback.
    render(<ProrationBreakdown quote={makeQuote()} t={t} />);
    expect(screen.getByText('-$5.00')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('states plainly that a scheduled downgrade charges nothing today', () => {
    render(
      <ProrationBreakdown
        quote={makeQuote({
          isScheduledForPeriodEnd: true,
          scheduledEffectiveAt: '2026-08-01T00:00:00.000Z',
          amountDueMinor: 0,
        })}
        t={t}
      />,
    );
    expect(screen.getByText('billing.proration.scheduledNoCharge')).toBeInTheDocument();
    expect(screen.queryByText('billing.proration.dueToday')).not.toBeInTheDocument();
  });
});

describe('UsageWindowBar', () => {
  function makeWindow(used: number, limit: number | null): UsageWindow {
    return { used, limit, remaining: limit === null ? null : limit - used, periodKey: 'p' };
  }

  it('reports a real percentage for a limited window', () => {
    render(<UsageWindowBar label="Today" window={makeWindow(50, 100)} t={t} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('does not claim a percentage for an unlimited window', () => {
    render(<UsageWindowBar label="Today" window={makeWindow(9000, null)} t={t} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText(/billing\.usage\.usedUnlimited/)).toBeInTheDocument();
  });

  it('shows a disabled window as full, not empty', () => {
    render(<UsageWindowBar label="Today" window={makeWindow(0, 0)} t={t} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('PaymentMethodList', () => {
  const methods: PaymentMethodView[] = [
    {
      id: 'pm-1',
      gateway: 'PAYPAL',
      brand: 'Visa',
      last4: '4242',
      expiryMonth: 4,
      expiryYear: 2030,
      isDefault: true,
    },
    {
      id: 'pm-2',
      gateway: 'PAYMOB',
      brand: 'Mastercard',
      last4: '4444',
      expiryMonth: null,
      expiryYear: null,
      isDefault: false,
    },
  ];

  it('disables only the row being removed', async () => {
    render(
      <PaymentMethodList
        methods={methods}
        isLoading={false}
        isError={false}
        onAdd={vi.fn()}
        isAdding={false}
        onRemove={vi.fn()}
        pendingId="pm-1"
        t={t}
      />,
    );
    // A single page-wide isMutating flag would freeze every row here. The
    // second card must stay actionable while the first is being removed.
    expect(screen.getByRole('button', { name: 'billing.paymentMethods.removing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'billing.paymentMethods.remove' })).toBeEnabled();
  });

  it('passes the row id to the remove handler', async () => {
    const onRemove = vi.fn();
    render(
      <PaymentMethodList
        methods={methods}
        isLoading={false}
        isError={false}
        onAdd={vi.fn()}
        isAdding={false}
        onRemove={onRemove}
        pendingId={null}
        t={t}
      />,
    );
    const [, secondRowButton] = screen.getAllByRole('button', {
      name: 'billing.paymentMethods.remove',
    });
    if (secondRowButton === undefined) {
      throw new Error('expected a remove button on the second row');
    }
    await userEvent.click(secondRowButton);
    expect(onRemove).toHaveBeenCalledWith('pm-2');
  });

  it('renders the empty state', () => {
    render(
      <PaymentMethodList
        methods={[]}
        isLoading={false}
        isError={false}
        onAdd={vi.fn()}
        isAdding={false}
        onRemove={vi.fn()}
        pendingId={null}
        t={t}
      />,
    );
    expect(screen.getByText('billing.paymentMethods.empty')).toBeInTheDocument();
  });

  it('records the explicit add action and disables it while setup starts', async () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <PaymentMethodList
        methods={[]}
        isLoading={false}
        isError={false}
        onAdd={onAdd}
        isAdding={false}
        onRemove={vi.fn()}
        pendingId={null}
        t={t}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'billing.paymentMethods.add' }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.getByText('billing.paymentMethods.consent')).toBeInTheDocument();

    rerender(
      <PaymentMethodList
        methods={[]}
        isLoading={false}
        isError={false}
        onAdd={onAdd}
        isAdding
        onRemove={vi.fn()}
        pendingId={null}
        t={t}
      />,
    );
    expect(screen.getByRole('button', { name: 'billing.paymentMethods.adding' })).toBeDisabled();
  });
});

describe('InvoiceTable', () => {
  const invoices: InvoiceView[] = [
    {
      id: 'invoice-1',
      number: 'CLAW-00000001',
      status: 'PAID',
      currency: 'USD',
      totalMinor: 2_000,
      issuedAt: '2026-07-27T00:00:00.000Z',
      paidAt: '2026-07-27T00:00:00.000Z',
      hostedInvoiceUrl: null,
    },
  ];

  it('offers an authenticated download even without a hosted provider URL', async () => {
    const onDownload = vi.fn();
    render(
      <InvoiceTable
        invoices={invoices}
        isLoading={false}
        isError={false}
        onDownload={onDownload}
        pendingId={null}
        isDownloadError={false}
        t={t}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'billing.invoices.download' }));
    expect(onDownload).toHaveBeenCalledWith('invoice-1', 'CLAW-00000001');
  });
});

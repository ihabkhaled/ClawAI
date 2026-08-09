import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BillingCheckoutPage from '@/app/(portal)/billing/checkout/page';
import { BillingGateway, BillingInterval } from '@/enums/billing.enum';

const checkoutState = vi.hoisted(() => ({
  startCheckout: vi.fn(),
  search: 'plan=pro&interval=yearly',
  amountMinor: 20_000,
  gateways: [
    {
      gateway: 'PAYPAL',
      mode: 'sandbox',
      publicIdentifier: 'client-id',
      testingSoon: false,
    },
  ],
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(checkoutState.search),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

vi.mock('@/hooks/billing/use-billing-plans', () => ({
  useBillingPlans: () => ({
    plans: [
      {
        id: 'plan-pro',
        slug: 'pro',
        name: 'Pro',
        description: null,
        displayOrder: 1,
        isDefault: false,
        prices: [
          {
            billingInterval: BillingInterval.YEARLY,
            currency: 'USD',
            amountMinor: checkoutState.amountMinor,
            planPriceVersionId: 'price-yearly',
          },
        ],
        dailyTokenQuota: null,
        weeklyTokenQuota: null,
        monthlyTokenQuota: null,
        maxChatsPerDay: null,
        maxMessagesPerDay: null,
        maxWorkspaceConnections: null,
        maxContextPacks: null,
        maxMemoryItems: null,
        features: [],
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/hooks/billing/use-billing-gateways', () => ({
  useBillingGateways: () => ({
    gateways: checkoutState.gateways,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/billing/use-start-checkout', () => ({
  useStartCheckout: () => ({
    startCheckout: checkoutState.startCheckout,
    isPending: false,
    error: null,
    clearError: vi.fn(),
    gatewaySession: null,
    closeGateway: vi.fn(),
    completeGateway: vi.fn(),
  }),
}));

describe('BillingCheckoutPage', () => {
  beforeEach(() => {
    checkoutState.startCheckout.mockReset();
    checkoutState.search = 'plan=pro&interval=yearly';
    checkoutState.amountMinor = 20_000;
    checkoutState.gateways = [
      {
        gateway: 'PAYPAL',
        mode: 'sandbox',
        publicIdentifier: 'client-id',
        testingSoon: false,
      },
    ];
  });

  it('reviews the server plan price and starts PayPal/Card checkout', async () => {
    render(<BillingCheckoutPage />);

    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'billing.planChange.confirm' }));

    expect(checkoutState.startCheckout).toHaveBeenCalledWith({
      planId: 'plan-pro',
      billingInterval: BillingInterval.YEARLY,
      gateway: BillingGateway.PAYPAL,
    });
  });

  it('keeps checkout disabled when no production gateway is available', () => {
    checkoutState.gateways = [
      {
        gateway: 'PAYMOB',
        mode: 'test',
        publicIdentifier: '',
        testingSoon: true,
      },
    ];

    render(<BillingCheckoutPage />);

    expect(screen.getByText('billing.gateway.unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'billing.planChange.confirm' })).toBeDisabled();
  });

  it('fails closed when the requested plan slug is not in the server catalog', () => {
    checkoutState.search = 'plan=missing&interval=yearly';

    render(<BillingCheckoutPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('billing.plans.error');
    expect(screen.queryByRole('button', { name: 'billing.planChange.confirm' })).toBeNull();
  });

  it('defaults an unrecognized interval to the monthly server price lookup', () => {
    checkoutState.search = 'plan=pro&interval=unexpected';

    render(<BillingCheckoutPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('billing.plans.error');
    expect(checkoutState.startCheckout).not.toHaveBeenCalled();
  });

  it('does not send a zero-value plan to a payment gateway', () => {
    checkoutState.amountMinor = 0;

    render(<BillingCheckoutPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('billing.plans.error');
    expect(screen.queryByRole('button', { name: 'billing.planChange.confirm' })).toBeNull();
  });
});

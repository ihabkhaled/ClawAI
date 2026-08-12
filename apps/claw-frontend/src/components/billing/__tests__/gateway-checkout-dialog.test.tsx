import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GatewayCheckoutDialog } from '@/components/billing/gateway-checkout-dialog';
import { BillingGateway } from '@/enums/billing.enum';
import type { CheckoutGatewayView } from '@/types/billing.types';

const mockCompletePaymob = vi.fn();
const mockCompletePaypalSdk = vi.fn();
const mockLoadPixel = vi.fn();
const mockGetCheckoutSession = vi.fn();
const mockGetSetupSession = vi.fn();
const mockGatewayList: CheckoutGatewayView[] = [
  {
    gateway: BillingGateway.PAYPAL,
    mode: 'sandbox',
    publicIdentifier: 'paypal-client-test',
    testingSoon: false,
  },
];

function createPopupWindow(): Window {
  const popup = Object.create(window) as Window;
  Object.defineProperty(popup, 'closed', { configurable: true, value: false, writable: true });
  popup.close = vi.fn();
  return popup;
}

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    completePaymobCheckout: (...args: unknown[]) => mockCompletePaymob(...args),
    completePaypalSdkCheckout: (...args: unknown[]) => mockCompletePaypalSdk(...args),
    getCheckoutSession: (...args: unknown[]) => mockGetCheckoutSession(...args),
    getPaymentMethodSetupSession: (...args: unknown[]) => mockGetSetupSession(...args),
  },
}));

vi.mock('@/utilities/paymob-pixel.utility', () => ({
  loadPaymobPixel: () => mockLoadPixel(),
  readPaymobCredentials: () => ({ publicKey: 'pk_test', clientSecret: 'secret_test' }),
}));

const t = (key: string): string => key;

describe('GatewayCheckoutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'paypal-client-test');
    mockLoadPixel.mockResolvedValue(undefined);
    mockCompletePaymob.mockResolvedValue({
      status: 'COMPLETED',
      subscriptionId: 'subscription-1',
      paymentMethodPending: false,
    });
    mockCompletePaypalSdk.mockResolvedValue({
      id: 'checkout-1',
      status: 'COMPLETED',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.Pixel;
    Reflect.deleteProperty(window, 'paypal');
    vi.unstubAllEnvs();
  });

  it('opens Paymob in an app-controlled popup instead of rendering the provider in billing', async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    const popup = createPopupWindow();
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);
    mockGetCheckoutSession.mockResolvedValue({
      id: 'checkout-1',
      status: 'AWAITING_PAYMENT',
    });

    render(
      <GatewayCheckoutDialog
        session={{
          id: 'checkout-1',
          status: 'AWAITING_PAYMENT',
          gateway: BillingGateway.PAYMOB,
          chargeAmountMinor: 103,
          chargeCurrency: 'EGP',
          hostedCheckoutUrl: 'https://accept.paymob.com/unifiedcheckout/',
          expiresAt: '2026-07-28T00:00:00.000Z',
        }}
        gateways={mockGatewayList}
        onClose={vi.fn()}
        onComplete={complete}
        t={t}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'billing.gatewayDialog.openPaymob' }));

    expect(open).toHaveBeenCalledWith(
      `${window.location.origin}/billing/payment-window?session=checkout-1`,
      'claw-paymob-checkout',
      expect.stringContaining('popup'),
    );
    expect(window.Pixel).toBeUndefined();
    expect(mockCompletePaymob).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it('closes the Paymob popup and refreshes main billing only after verified completion', async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    const popup = createPopupWindow();
    vi.spyOn(window, 'open').mockReturnValue(popup);
    mockGetCheckoutSession.mockResolvedValue({
      id: 'checkout-1',
      status: 'COMPLETED',
    });

    render(
      <GatewayCheckoutDialog
        session={{
          id: 'checkout-1',
          status: 'AWAITING_PAYMENT',
          gateway: BillingGateway.PAYMOB,
          chargeAmountMinor: 103,
          chargeCurrency: 'EGP',
          hostedCheckoutUrl: 'https://accept.paymob.com/unifiedcheckout/',
          expiresAt: '2026-07-28T00:00:00.000Z',
        }}
        gateways={mockGatewayList}
        onClose={vi.fn()}
        onComplete={complete}
        t={t}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'billing.gatewayDialog.openPaymob' }));

    await waitFor(() => {
      expect(complete).toHaveBeenCalledOnce();
    });
    expect(mockGetCheckoutSession).toHaveBeenCalledWith('checkout-1');
    expect(popup.close).toHaveBeenCalledOnce();
    expect(mockCompletePaymob).not.toHaveBeenCalled();
  });

  it('keeps polling after Paymob closes until the webhook is verified', async () => {
    vi.useFakeTimers();
    const complete = vi.fn().mockResolvedValue(undefined);
    const popup = createPopupWindow();
    vi.spyOn(window, 'open').mockReturnValue(popup);
    mockGetCheckoutSession
      .mockResolvedValueOnce({ id: 'checkout-1', status: 'AWAITING_PAYMENT' })
      .mockResolvedValueOnce({ id: 'checkout-1', status: 'COMPLETED' });

    render(
      <GatewayCheckoutDialog
        session={{
          id: 'checkout-1',
          status: 'AWAITING_PAYMENT',
          gateway: BillingGateway.PAYMOB,
          chargeAmountMinor: 103,
          chargeCurrency: 'EGP',
          hostedCheckoutUrl: 'https://accept.paymob.com/unifiedcheckout/',
          expiresAt: '2026-07-28T00:00:00.000Z',
        }}
        gateways={mockGatewayList}
        onClose={vi.fn()}
        onComplete={complete}
        t={t}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'billing.gatewayDialog.openPaymob' }));
    await vi.waitFor(() => expect(mockGetCheckoutSession).toHaveBeenCalledOnce());
    Reflect.set(popup, 'closed', true);
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());

    expect(mockGetCheckoutSession).toHaveBeenCalledTimes(2);
  });

  it('restores dialog controls when the Paymob popup is closed without payment', async () => {
    vi.useFakeTimers();
    const closeDialog = vi.fn();
    const popup = createPopupWindow();
    vi.spyOn(window, 'open').mockReturnValue(popup);
    mockGetCheckoutSession.mockResolvedValue({
      id: 'checkout-1',
      status: 'AWAITING_PAYMENT',
    });

    render(
      <GatewayCheckoutDialog
        session={{
          id: 'checkout-1',
          status: 'AWAITING_PAYMENT',
          gateway: BillingGateway.PAYMOB,
          chargeAmountMinor: 103,
          chargeCurrency: 'EGP',
          hostedCheckoutUrl: 'https://accept.paymob.com/unifiedcheckout/',
          expiresAt: '2026-07-28T00:00:00.000Z',
        }}
        gateways={mockGatewayList}
        onClose={closeDialog}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        t={t}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'billing.gatewayDialog.openPaymob' }));
    await vi.waitFor(() => expect(mockGetCheckoutSession).toHaveBeenCalledOnce());
    Reflect.set(popup, 'closed', true);
    await act(() => vi.advanceTimersByTimeAsync(2_000));

    expect(screen.queryByText('billing.gatewayDialog.verifying')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(closeDialog).toHaveBeenCalledOnce();
  });

  it('renders eligible PayPal wallet and card buttons inside the modal', async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    let resolvePaypalRender: (() => void) | undefined;
    let resolveCardRender: (() => void) | undefined;
    const paypalRender = new Promise<void>((resolve) => {
      resolvePaypalRender = resolve;
    });
    const cardRender = new Promise<void>((resolve) => {
      resolveCardRender = resolve;
    });
    const renderButton = vi
      .fn()
      .mockImplementationOnce(() => paypalRender)
      .mockImplementationOnce(() => cardRender);
    const buttonOptions: Array<Record<string, unknown>> = [];
    const buttons = vi.fn((options: Record<string, unknown>) => {
      buttonOptions.push(options);
      return {
        isEligible: () => true,
        render: renderButton,
        close: vi.fn(),
      };
    });
    Reflect.set(window, 'paypal', {
      FUNDING: { PAYPAL: 'paypal', CARD: 'card' },
      Buttons: buttons,
    });

    render(
      <GatewayCheckoutDialog
        session={{
          id: 'checkout-1',
          status: 'AWAITING_PAYMENT',
          gateway: BillingGateway.PAYPAL,
          chargeAmountMinor: 2,
          chargeCurrency: 'USD',
          hostedCheckoutUrl: 'https://www.paypal.com/checkoutnow?token=ORDER-1',
          expiresAt: '2026-07-28T00:00:00.000Z',
        }}
        gateways={mockGatewayList}
        onClose={vi.fn()}
        onComplete={complete}
        t={t}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('billing.gatewayDialog.loadingPaypal');
    expect(screen.getByTestId('paypal-buttons')).toHaveClass('opacity-0', 'pointer-events-none');
    expect(screen.getByTestId('paypal-buttons')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('status')).toHaveClass('z-20', 'bg-white');

    await waitFor(() => {
      expect(buttons).toHaveBeenCalledOnce();
    });
    resolvePaypalRender?.();
    await waitFor(() => expect(buttons).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('paypal-buttons')).toHaveClass('opacity-0', 'pointer-events-none');
    resolveCardRender?.();
    await waitFor(() => {
      expect(screen.queryByText('billing.gatewayDialog.loadingPaypal')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('paypal-buttons')).toHaveClass('opacity-100');
    expect(screen.getByTestId('paypal-buttons')).toHaveAttribute('aria-hidden', 'false');
    expect(buttonOptions.map((options) => options['fundingSource'])).toEqual(['paypal', 'card']);
    const cardOptions = buttonOptions[1];
    expect(cardOptions).toBeDefined();
    if (cardOptions === undefined) {
      return;
    }
    const createOrder = cardOptions['createOrder'];
    const onApprove = cardOptions['onApprove'];
    expect(createOrder).toBeInstanceOf(Function);
    expect(onApprove).toBeInstanceOf(Function);
    if (typeof createOrder !== 'function' || typeof onApprove !== 'function') {
      return;
    }

    await expect(createOrder()).resolves.toBe('ORDER-1');
    await onApprove({ orderID: 'ORDER-1' });
    expect(mockCompletePaypalSdk).toHaveBeenCalledWith('checkout-1', {
      providerOrderId: 'ORDER-1',
    });
    expect(complete).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('button', { name: 'billing.gatewayDialog.openPaypal' }),
    ).not.toBeInTheDocument();
  });
});

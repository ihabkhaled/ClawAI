import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GatewayCheckoutDialog } from '@/components/billing/gateway-checkout-dialog';
import { BillingGateway } from '@/enums/billing.enum';

const mockCompletePaymob = vi.fn();
const mockCompletePaypalSdk = vi.fn();
const mockLoadPixel = vi.fn();

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    completePaymobCheckout: (...args: unknown[]) => mockCompletePaymob(...args),
    completePaypalSdkCheckout: (...args: unknown[]) => mockCompletePaypalSdk(...args),
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
    delete window.Pixel;
    Reflect.deleteProperty(window, 'paypal');
    vi.unstubAllEnvs();
  });

  it('renders Paymob Pixel inside the Claw dialog and verifies completion server-side', async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    let afterPaymentComplete: (() => Promise<void>) | undefined;
    window.Pixel = vi.fn(function PixelMock(options: {
      afterPaymentComplete: () => Promise<void>;
    }) {
      afterPaymentComplete = options.afterPaymentComplete;
      return {};
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
        onClose={vi.fn()}
        onComplete={complete}
        t={t}
      />,
    );

    await waitFor(() => {
      expect(window.Pixel).toHaveBeenCalledOnce();
    });
    await afterPaymentComplete?.();

    expect(mockCompletePaymob).toHaveBeenCalledWith('checkout-1');
    expect(complete).toHaveBeenCalledOnce();
  });

  it('keeps Paymob card text readable on its provider-controlled light surface', async () => {
    window.Pixel = vi.fn(() => ({}));

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
        onClose={vi.fn()}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        t={t}
      />,
    );

    await waitFor(() => {
      expect(window.Pixel).toHaveBeenCalledOnce();
    });
    const paymobSurface = document.querySelector('[id^="paymob-elements-"]');

    expect(paymobSurface).toHaveClass('bg-white', '[color-scheme:light]');
  });

  it('renders eligible PayPal wallet and card buttons inside the modal', async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    const renderButton = vi.fn().mockResolvedValue(undefined);
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
        onClose={vi.fn()}
        onComplete={complete}
        t={t}
      />,
    );

    await waitFor(() => {
      expect(buttons).toHaveBeenCalledTimes(2);
    });
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

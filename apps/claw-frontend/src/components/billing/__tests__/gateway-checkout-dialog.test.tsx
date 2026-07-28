import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GatewayCheckoutDialog } from '@/components/billing/gateway-checkout-dialog';
import { BillingGateway } from '@/enums/billing.enum';

const mockCompletePaymob = vi.fn();
const mockLoadPixel = vi.fn();

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    completePaymobCheckout: (...args: unknown[]) => mockCompletePaymob(...args),
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
    mockLoadPixel.mockResolvedValue(undefined);
    mockCompletePaymob.mockResolvedValue({
      status: 'COMPLETED',
      subscriptionId: 'subscription-1',
      paymentMethodPending: false,
    });
  });

  afterEach(() => {
    delete window.Pixel;
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

  it('opens PayPal in a controlled popup instead of navigating the billing page', async () => {
    const popup = vi.spyOn(window, 'open').mockReturnValue(window);

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
        onComplete={vi.fn().mockResolvedValue(undefined)}
        t={t}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'billing.gatewayDialog.openPaypal' }));

    expect(popup).toHaveBeenCalledWith(
      'https://www.paypal.com/checkoutnow?token=ORDER-1',
      'claw-paypal-checkout',
      expect.stringContaining('popup'),
    );
  });
});

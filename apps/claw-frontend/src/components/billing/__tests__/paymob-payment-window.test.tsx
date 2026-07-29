import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymobPaymentWindow } from '@/components/billing/paymob-payment-window';

const mockGetCheckoutSession = vi.fn();
const mockGetSetupSession = vi.fn();
const mockLoadPixel = vi.fn();
const searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    getCheckoutSession: (...args: unknown[]) => mockGetCheckoutSession(...args),
    getPaymentMethodSetupSession: (...args: unknown[]) => mockGetSetupSession(...args),
  },
}));

vi.mock('@/utilities/paymob-pixel.utility', () => ({
  loadPaymobPixel: () => mockLoadPixel(),
  readPaymobCredentials: () => ({ publicKey: 'pk_test', clientSecret: 'secret_test' }),
}));

describe('PaymobPaymentWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.set('session', 'checkout-1');
    searchParams.delete('setup');
    mockLoadPixel.mockResolvedValue(undefined);
    mockGetCheckoutSession.mockResolvedValue({
      id: 'checkout-1',
      status: 'AWAITING_PAYMENT',
      gateway: 'PAYMOB',
      chargeAmountMinor: 103,
      chargeCurrency: 'EGP',
      hostedCheckoutUrl: 'https://accept.paymob.com/unifiedcheckout/?clientSecret=test',
      expiresAt: '2026-07-28T00:00:00.000Z',
    });
  });

  it('embeds Paymob in the payment window and closes without navigating on completion', async () => {
    let afterPaymentComplete: (() => void) | undefined;
    window.Pixel = vi.fn(function PixelMock(options: { afterPaymentComplete: () => void }) {
      afterPaymentComplete = options.afterPaymentComplete;
      return {};
    });
    const postMessage = vi.fn();
    Reflect.defineProperty(window, 'opener', {
      configurable: true,
      value: { closed: false, postMessage },
    });
    const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    render(<PaymobPaymentWindow />);

    await waitFor(() => {
      expect(window.Pixel).toHaveBeenCalledOnce();
    });
    const surface = document.querySelector('[id^="paymob-payment-window-"]');
    expect(surface).toHaveClass('bg-white', 'text-slate-950', '[color-scheme:light]');

    afterPaymentComplete?.();

    expect(postMessage).toHaveBeenCalledWith(
      { type: 'claw:billing:paymob-completed', sessionId: 'checkout-1' },
      window.location.origin,
    );
    expect(close).toHaveBeenCalledOnce();
    expect(window.location.pathname).not.toContain('/billing/return');
  });
});

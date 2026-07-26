import { BillingErrorCode, BillingInterval, CheckoutSessionStatus } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { PaymentActivationService } from '../payment-activation.service';
import type { BillingCustomerRepository } from '../../repositories/billing-customer.repository';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { SubscriptionLifecycleService } from '../../../billing/services/subscription-lifecycle.service';

const PAYMENT = {
  checkoutSessionId: 'cs-1',
  providerTransactionId: 'CAP-1',
  amountMinor: 1999,
  currency: 'USD',
  correlationId: 'WH-1',
};

function makeSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cs-1',
    userId: 'user-1',
    status: CheckoutSessionStatus.AWAITING_PAYMENT,
    gateway: 'PAYPAL',
    planId: 'plan-pro',
    planSlug: 'pro',
    planPriceVersionId: 'ppv-1',
    billingInterval: BillingInterval.MONTHLY,
    baseAmountMinor: 1999,
    baseCurrency: 'USD',
    chargeAmountMinor: 1999,
    chargeCurrency: 'USD',
    subscriptionId: null,
    ...overrides,
  };
}

describe('PaymentActivationService', () => {
  let sessions: { findById: jest.Mock; markFailed: jest.Mock };
  let customers: { ensureForUser: jest.Mock };
  let lifecycle: { activateFromVerifiedPayment: jest.Mock };
  let service: PaymentActivationService;

  beforeEach(() => {
    sessions = { findById: jest.fn(), markFailed: jest.fn() };
    customers = { ensureForUser: jest.fn().mockResolvedValue({ id: 'bc-1' }) };
    lifecycle = { activateFromVerifiedPayment: jest.fn().mockResolvedValue('sub-1') };
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ BILLING_GRACE_PERIOD_MS: 259_200_000 } as ReturnType<
        typeof AppConfig.get
      >);
    service = new PaymentActivationService(
      sessions as unknown as CheckoutSessionRepository,
      customers as unknown as BillingCustomerRepository,
      lifecycle as unknown as SubscriptionLifecycleService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('activates a matching payment and asserts verification to the lifecycle', async () => {
    sessions.findById.mockResolvedValue(makeSession());

    await expect(service.activate(PAYMENT)).resolves.toBe('sub-1');

    expect(lifecycle.activateFromVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentVerified: true, userId: 'user-1', planId: 'plan-pro' }),
    );
  });

  it('refuses a payment whose amount differs from what we recorded', async () => {
    // The gateway says one cent. Our session says $19.99. Accepting the
    // gateway's figure is exactly the bug that hands out a paid plan for free.
    sessions.findById.mockResolvedValue(makeSession());

    await expect(service.activate({ ...PAYMENT, amountMinor: 1 })).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_AMOUNT_MISMATCH,
    });
    expect(lifecycle.activateFromVerifiedPayment).not.toHaveBeenCalled();
    expect(sessions.markFailed).toHaveBeenCalledWith('cs-1', 'PAYMENT_AMOUNT_MISMATCH');
  });

  it('refuses a payment in a different currency', async () => {
    sessions.findById.mockResolvedValue(makeSession());

    await expect(service.activate({ ...PAYMENT, currency: 'EGP' })).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_AMOUNT_MISMATCH,
    });
    expect(lifecycle.activateFromVerifiedPayment).not.toHaveBeenCalled();
  });

  it('returns the existing subscription for a replayed completed session', async () => {
    // A second subscription for one payment would be a duplicate entitlement
    // and, at renewal, a duplicate charge.
    sessions.findById.mockResolvedValue(
      makeSession({ status: CheckoutSessionStatus.COMPLETED, subscriptionId: 'sub-existing' }),
    );

    await expect(service.activate(PAYMENT)).resolves.toBe('sub-existing');
    expect(lifecycle.activateFromVerifiedPayment).not.toHaveBeenCalled();
  });

  it('rejects a payment for an unknown session', async () => {
    sessions.findById.mockResolvedValue(null);

    await expect(service.activate(PAYMENT)).rejects.toMatchObject({
      code: BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND,
    });
  });

  it('extends entitlement past the period end by the grace window', async () => {
    sessions.findById.mockResolvedValue(makeSession());

    await service.activate(PAYMENT);

    const input = lifecycle.activateFromVerifiedPayment.mock.calls[0]?.[0] as {
      periodEndMs: number;
      entitlementValidUntilMs: number;
    };
    // A renewal that lands a few hours late must not lock a paying customer
    // out mid-sentence.
    expect(input.entitlementValidUntilMs - input.periodEndMs).toBe(259_200_000);
  });

  it('activates on the canonical base amount, not the settled charge amount', async () => {
    // Paymob settles in EGP. The subscription's own price stays USD, or the
    // plan becomes unreadable after settlement.
    sessions.findById.mockResolvedValue(
      makeSession({ chargeAmountMinor: 97_391, chargeCurrency: 'EGP' }),
    );

    await service.activate({ ...PAYMENT, amountMinor: 97_391, currency: 'EGP' });

    expect(lifecycle.activateFromVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({ baseAmountMinor: 1999, baseCurrency: 'USD' }),
    );
  });
});

import {
  BillingErrorCode,
  BillingInterval,
  CheckoutPurpose,
  CheckoutSessionStatus,
} from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { PaymentActivationService } from '../payment-activation.service';
import type { BillingCustomerRepository } from '../../repositories/billing-customer.repository';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { SubscriptionLifecycleService } from '../../../billing/services/subscription-lifecycle.service';
import type { CreditTopupLifecycleService } from '../../../billing/services/credit-topup-lifecycle.service';

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
    billingEmail: 'buyer@example.com',
    purpose: CheckoutPurpose.NEW_SUBSCRIPTION,
    subscriptionId: null,
    prorationQuoteId: null,
    creditPackageId: null,
    creditPackageVersionId: null,
    creditMicroUsd: null,
    ...overrides,
  };
}

describe('PaymentActivationService', () => {
  let sessions: { findById: jest.Mock; markFailed: jest.Mock };
  let customers: { ensureForUser: jest.Mock };
  let lifecycle: {
    activateFromVerifiedPayment: jest.Mock;
    activatePlanChangeFromVerifiedPayment: jest.Mock;
  };
  let creditTopups: { activateFromVerifiedPayment: jest.Mock };
  let service: PaymentActivationService;

  beforeEach(() => {
    sessions = { findById: jest.fn(), markFailed: jest.fn() };
    customers = { ensureForUser: jest.fn().mockResolvedValue({ id: 'bc-1' }) };
    // Returns an ActivationResult, not a bare id: activation now also records the
    // payment transaction and issues the invoice, and the caller reports the
    // invoice number in its log line.
    lifecycle = {
      activateFromVerifiedPayment: jest.fn().mockResolvedValue({
        subscriptionId: 'sub-1',
        transactionId: 'tx-1',
        invoiceNumber: 'CLAW-00000001',
      }),
      activatePlanChangeFromVerifiedPayment: jest.fn().mockResolvedValue({
        subscriptionId: 'sub-existing',
        transactionId: 'tx-upgrade',
        invoiceNumber: 'CLAW-00000002',
      }),
    };
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ BILLING_GRACE_PERIOD_MS: 259_200_000 } as ReturnType<
        typeof AppConfig.get
      >);
    creditTopups = {
      activateFromVerifiedPayment: jest.fn().mockResolvedValue({
        paymentTransactionId: 'tx-topup',
        invoiceNumber: 'CLAW-00000003',
        outboxEventId: 'evt-1',
      }),
    };
    service = new PaymentActivationService(
      sessions as unknown as CheckoutSessionRepository,
      customers as unknown as BillingCustomerRepository,
      lifecycle as unknown as SubscriptionLifecycleService,
      creditTopups as unknown as CreditTopupLifecycleService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('activates a matching payment and asserts verification to the lifecycle', async () => {
    sessions.findById.mockResolvedValue(makeSession());

    await expect(service.activate(PAYMENT)).resolves.toBe('sub-1');

    expect(lifecycle.activateFromVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentVerified: true,
        userId: 'user-1',
        planId: 'plan-pro',
        invoiceRecipientEmail: 'buyer@example.com',
      }),
    );
  });

  it('applies a paid upgrade to its existing subscription instead of creating another one', async () => {
    sessions.findById.mockResolvedValue(
      makeSession({
        purpose: CheckoutPurpose.UPGRADE,
        subscriptionId: 'sub-existing',
        prorationQuoteId: 'quote-1',
        baseAmountMinor: 500,
        chargeAmountMinor: 500,
      }),
    );

    await expect(service.activate({ ...PAYMENT, amountMinor: 500 })).resolves.toBe('sub-existing');

    expect(lifecycle.activatePlanChangeFromVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        existingSubscriptionId: 'sub-existing',
        prorationQuoteId: 'quote-1',
        baseAmountMinor: 500,
      }),
    );
    expect(lifecycle.activateFromVerifiedPayment).not.toHaveBeenCalled();
  });

  it('fails closed when an upgrade session is missing its bound proration quote', async () => {
    sessions.findById.mockResolvedValue(
      makeSession({ purpose: CheckoutPurpose.UPGRADE, subscriptionId: 'sub-existing' }),
    );

    await expect(service.activate(PAYMENT)).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
    });
    expect(lifecycle.activatePlanChangeFromVerifiedPayment).not.toHaveBeenCalled();
    expect(lifecycle.activateFromVerifiedPayment).not.toHaveBeenCalled();
    expect(customers.ensureForUser).not.toHaveBeenCalled();
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

/**
 * The top-up branch of the single door.
 *
 * A credit top-up is a real purchase with a real invoice and no plan. These
 * cover the two failures that would matter most: minting a subscription from a
 * wallet purchase, and granting the same credit twice on a redelivered webhook.
 */
describe('PaymentActivationService — credit top-up', () => {
  let sessions: { findById: jest.Mock; markFailed: jest.Mock };
  let customers: { ensureForUser: jest.Mock };
  let lifecycle: {
    activateFromVerifiedPayment: jest.Mock;
    activatePlanChangeFromVerifiedPayment: jest.Mock;
  };
  let creditTopups: { activateFromVerifiedPayment: jest.Mock };
  let service: PaymentActivationService;

  const topupSession = (overrides: Record<string, unknown> = {}): Record<string, unknown> =>
    makeSession({
      purpose: CheckoutPurpose.CREDIT_TOPUP,
      planId: null,
      planSlug: null,
      planPriceVersionId: null,
      billingInterval: null,
      baseAmountMinor: 2500,
      baseCurrency: 'USD',
      chargeAmountMinor: 2500,
      chargeCurrency: 'USD',
      creditPackageId: 'pkg-25',
      creditPackageVersionId: 'cpv-9',
      creditMicroUsd: 15_000_000n,
      providerOrderId: 'order-1',
      ...overrides,
    });

  const topupPayment = { ...PAYMENT, amountMinor: 2500 };

  beforeEach(() => {
    sessions = { findById: jest.fn(), markFailed: jest.fn() };
    customers = { ensureForUser: jest.fn().mockResolvedValue({ id: 'bc-1' }) };
    lifecycle = {
      activateFromVerifiedPayment: jest.fn(),
      activatePlanChangeFromVerifiedPayment: jest.fn(),
    };
    creditTopups = {
      activateFromVerifiedPayment: jest.fn().mockResolvedValue({
        paymentTransactionId: 'tx-topup',
        invoiceNumber: 'CLAW-00000003',
        outboxEventId: 'evt-1',
      }),
    };
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ BILLING_GRACE_PERIOD_MS: 259_200_000 } as ReturnType<
        typeof AppConfig.get
      >);
    service = new PaymentActivationService(
      sessions as unknown as CheckoutSessionRepository,
      customers as unknown as BillingCustomerRepository,
      lifecycle as unknown as SubscriptionLifecycleService,
      creditTopups as unknown as CreditTopupLifecycleService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('grants credit and creates NO subscription', async () => {
    sessions.findById.mockResolvedValue(topupSession());

    await expect(service.activate(topupPayment)).resolves.toBeNull();

    expect(lifecycle.activateFromVerifiedPayment).not.toHaveBeenCalled();
    expect(lifecycle.activatePlanChangeFromVerifiedPayment).not.toHaveBeenCalled();
    expect(creditTopups.activateFromVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentVerified: true,
        userId: 'user-1',
        packageId: 'pkg-25',
        packageVersionId: 'cpv-9',
        creditMicroUsd: 15_000_000n,
      }),
    );
  });

  it('takes the credit from the session, never from the gateway payload', async () => {
    sessions.findById.mockResolvedValue(topupSession());

    // A payload naming a larger amount is refused outright below; here the
    // point is that nothing in the payload can influence the credit figure.
    await service.activate(topupPayment);

    expect(creditTopups.activateFromVerifiedPayment).toHaveBeenCalledWith(
      expect.objectContaining({ creditMicroUsd: 15_000_000n, baseAmountMinor: 2500 }),
    );
  });

  it('grants credit exactly ONCE for a redelivered webhook', async () => {
    sessions.findById.mockResolvedValueOnce(topupSession());
    // The second delivery finds the session already completed by the first.
    sessions.findById.mockResolvedValueOnce(
      topupSession({ status: CheckoutSessionStatus.COMPLETED }),
    );

    await service.activate(topupPayment);
    await service.activate(topupPayment);

    expect(creditTopups.activateFromVerifiedPayment).toHaveBeenCalledTimes(1);
  });

  it('still enforces the amount check on a top-up', async () => {
    sessions.findById.mockResolvedValue(topupSession());

    await expect(service.activate({ ...topupPayment, amountMinor: 1 })).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_AMOUNT_MISMATCH,
    });
    expect(creditTopups.activateFromVerifiedPayment).not.toHaveBeenCalled();
    expect(sessions.markFailed).toHaveBeenCalledWith(
      'cs-1',
      BillingErrorCode.PAYMENT_AMOUNT_MISMATCH,
    );
  });

  it('still enforces the currency check on a top-up', async () => {
    sessions.findById.mockResolvedValue(topupSession());

    await expect(service.activate({ ...topupPayment, currency: 'EGP' })).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_AMOUNT_MISMATCH,
    });
    expect(creditTopups.activateFromVerifiedPayment).not.toHaveBeenCalled();
  });

  it('refuses a CREDIT_TOPUP session with no package binding', async () => {
    // The database CHECK makes this row unstorable; the guard is what stops a
    // drifted row from being treated as a purchase of an unknown amount.
    sessions.findById.mockResolvedValue(
      topupSession({ creditPackageId: null, creditPackageVersionId: null, creditMicroUsd: null }),
    );

    await expect(service.activate(topupPayment)).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
    });
    expect(creditTopups.activateFromVerifiedPayment).not.toHaveBeenCalled();
  });
});

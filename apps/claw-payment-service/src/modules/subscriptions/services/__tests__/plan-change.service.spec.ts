import {
  BillingErrorCode,
  BillingGateway,
  BillingInterval,
  SubscriptionStatus,
} from '@claw/shared-types';

import { BillingException } from '../../../../common/errors';
import { PlanChangeService } from '../plan-change.service';
import type { PlanCatalogClient } from '../../../plan-catalog/plan-catalog.client';
import type { ProrationService } from '../../../billing/services/proration.service';
import type { CheckoutService } from '../../../checkout/services/checkout.service';
import type { ScheduledDowngradeService } from '../scheduled-downgrade.service';
import type { SubscriptionRepository } from '../../repositories/subscription.repository';

function makeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sub-1',
    userId: 'user-1',
    status: SubscriptionStatus.ACTIVE,
    planId: 'plan-starter',
    planSlug: 'starter',
    planPriceVersionId: 'ppv-old',
    currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    entitlementValidUntil: new Date('2026-08-04T00:00:00.000Z'),
    ...overrides,
  };
}

function makeQuote(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    quoteId: 'q-1',
    subscriptionId: 'sub-1',
    targetPlanId: 'plan-pro',
    targetPlanSlug: 'pro',
    targetPriceVersionId: 'ppv-new',
    targetAmountMinor: 2000,
    targetBillingInterval: 'MONTHLY',
    currency: 'USD',
    remainingRatioScaled: 5_000_000,
    unusedCurrentCreditMinor: 500,
    targetRemainingChargeMinor: 1000,
    amountDueMinor: 500,
    isScheduledForPeriodEnd: false,
    scheduledEffectiveAtMs: null,
    expiresAtMs: Date.parse('2026-07-26T00:15:00.000Z'),
    ...overrides,
  };
}

describe('PlanChangeService', () => {
  let subscriptions: { findActiveByUserId: jest.Mock };
  let proration: { quote: jest.Mock; consume: jest.Mock };
  let catalog: { requirePriceVersion: jest.Mock; requireActivePrice: jest.Mock };
  let downgrades: { schedule: jest.Mock; applyImmediately: jest.Mock };
  let checkout: { startPlanChange: jest.Mock };
  let service: PlanChangeService;

  beforeEach(() => {
    subscriptions = { findActiveByUserId: jest.fn().mockResolvedValue(makeSubscription()) };
    proration = { quote: jest.fn().mockResolvedValue(makeQuote()), consume: jest.fn() };
    catalog = {
      requirePriceVersion: jest
        .fn()
        .mockResolvedValue({ id: 'ppv-old', currency: 'USD', amountMinor: 999 }),
      requireActivePrice: jest
        .fn()
        .mockResolvedValue({ id: 'ppv-new', currency: 'USD', amountMinor: 1999 }),
    };
    downgrades = { schedule: jest.fn(), applyImmediately: jest.fn() };
    checkout = {
      startPlanChange: jest.fn().mockResolvedValue({
        id: 'cs-upgrade',
        status: 'AWAITING_PAYMENT',
        gateway: 'PAYPAL',
        chargeAmountMinor: 500,
        chargeCurrency: 'USD',
        hostedCheckoutUrl: 'https://pp/approve',
        expiresAt: '2026-07-26T00:30:00.000Z',
      }),
    };

    service = new PlanChangeService(
      subscriptions as unknown as SubscriptionRepository,
      proration as unknown as ProrationService,
      catalog as unknown as PlanCatalogClient,
      downgrades as unknown as ScheduledDowngradeService,
      checkout as unknown as CheckoutService,
    );
  });

  describe('quote', () => {
    it("prices the current side from the version actually purchased, not today's price", async () => {
      // If we read the current plan's ACTIVE price instead, a repricing since
      // the customer subscribed would silently change the credit they are owed
      // for time they already paid for.
      await service.quote('user-1', 'plan-pro', BillingInterval.MONTHLY);

      expect(catalog.requirePriceVersion).toHaveBeenCalledWith('ppv-old');
      expect(proration.quote).toHaveBeenCalledWith(
        expect.objectContaining({ currentAmountMinor: 999, targetAmountMinor: 1999 }),
      );
    });

    it('refuses to quote a change to the plan the user is already on', async () => {
      await expect(
        service.quote('user-1', 'plan-starter', BillingInterval.MONTHLY),
      ).rejects.toMatchObject({ code: BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT });
    });

    it('refuses to prorate across currencies', async () => {
      // Netting a USD credit against an EGP charge would produce a number that
      // means nothing in either currency.
      catalog.requireActivePrice.mockResolvedValue({
        id: 'ppv-new',
        currency: 'EGP',
        amountMinor: 99_000,
      });

      await expect(
        service.quote('user-1', 'plan-pro', BillingInterval.MONTHLY),
      ).rejects.toMatchObject({ code: BillingErrorCode.CURRENCY_UNSUPPORTED });
    });

    it('refuses a plan change while a payment is outstanding', async () => {
      // Taking an upgrade payment from someone whose last payment failed stacks
      // a second obligation on an unresolved one.
      subscriptions.findActiveByUserId.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.PAST_DUE }),
      );

      await expect(
        service.quote('user-1', 'plan-pro', BillingInterval.MONTHLY),
      ).rejects.toMatchObject({ code: BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT });
    });

    it('rejects a user with no subscription', async () => {
      subscriptions.findActiveByUserId.mockResolvedValue(null);

      await expect(service.quote('user-1', 'plan-pro', BillingInterval.MONTHLY)).rejects.toThrow(
        BillingException,
      );
    });

    it('serialises the expiry as an ISO string for the client', async () => {
      const quote = await service.quote('user-1', 'plan-pro', BillingInterval.MONTHLY);

      expect(quote.expiresAt).toBe('2026-07-26T00:15:00.000Z');
      expect(quote.amountDueMinor).toBe(500);
    });
  });

  describe('confirm', () => {
    it('consumes the quote by id rather than re-deriving the amount', async () => {
      // The user agreed to a specific number. Re-deriving here would let the
      // price move between quote and confirm.
      proration.consume.mockResolvedValue(makeQuote());

      await service.confirm({
        userId: 'user-1',
        userEmail: 'buyer@example.com',
        quoteId: 'q-1',
        gateway: BillingGateway.PAYPAL,
        idempotencyKey: 'idem-abcdefgh',
      });

      expect(proration.consume).toHaveBeenCalledWith('q-1', 'sub-1');
    });

    it('schedules a downgrade instead of charging or refunding', async () => {
      proration.consume.mockResolvedValue(
        makeQuote({
          isScheduledForPeriodEnd: true,
          amountDueMinor: 0,
          scheduledEffectiveAtMs: Date.parse('2026-08-01T00:00:00.000Z'),
        }),
      );

      const result = await service.confirm({
        userId: 'user-1',
        userEmail: 'buyer@example.com',
        quoteId: 'q-1',
        gateway: BillingGateway.PAYPAL,
        idempotencyKey: 'idem-abcdefgh',
      });

      expect(downgrades.schedule).toHaveBeenCalled();
      // null means the change is already applied and there is nothing to pay.
      expect(result).toBeNull();
      expect(checkout.startPlanChange).not.toHaveBeenCalled();
    });

    it('applies a zero-amount upgrade directly rather than opening a gateway order', async () => {
      // A zero-value order either fails at the provider or produces a
      // meaningless transaction.
      proration.consume.mockResolvedValue(makeQuote({ amountDueMinor: 0 }));

      const result = await service.confirm({
        userId: 'user-1',
        userEmail: 'buyer@example.com',
        quoteId: 'q-1',
        gateway: BillingGateway.PAYPAL,
        idempotencyKey: 'idem-abcdefgh',
      });

      expect(downgrades.applyImmediately).toHaveBeenCalled();
      expect(result).toBeNull();
      expect(checkout.startPlanChange).not.toHaveBeenCalled();
    });

    it('opens a checkout for the PRORATED amount, not the full plan price', async () => {
      proration.consume.mockResolvedValue(makeQuote({ amountDueMinor: 500 }));

      const result = await service.confirm({
        userId: 'user-1',
        userEmail: 'buyer@example.com',
        quoteId: 'q-1',
        gateway: BillingGateway.PAYPAL,
        idempotencyKey: 'idem-abcdefgh',
      });

      // 500 is the prorated difference the user confirmed. Charging the
      // target plan's full 1999 would bill them for a tier they part-own.
      expect(checkout.startPlanChange).toHaveBeenCalledWith(
        expect.objectContaining({ amountDueMinor: 500, prorationQuoteId: 'q-1' }),
      );
      expect(result?.hostedCheckoutUrl).toBe('https://pp/approve');
      expect(downgrades.applyImmediately).not.toHaveBeenCalled();
      expect(downgrades.schedule).not.toHaveBeenCalled();
    });

    it('propagates a consumed or expired quote as a refusal', async () => {
      proration.consume.mockRejectedValue(
        new BillingException(BillingErrorCode.PRORATION_QUOTE_EXPIRED),
      );

      await expect(
        service.confirm({
          userId: 'user-1',
          userEmail: 'buyer@example.com',
          quoteId: 'q-1',
          gateway: BillingGateway.PAYPAL,
          idempotencyKey: 'idem-abcdefgh',
        }),
      ).rejects.toMatchObject({ code: BillingErrorCode.PRORATION_QUOTE_EXPIRED });
    });
  });
});

import { ProrationQuoteStatus } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { ProrationService } from '../services/proration.service';
import { type ProrationQuoteRepository } from '../repositories/proration-quote.repository';
import { type ProrationQuoteInput } from '../types/proration.types';

const DAY = 24 * 60 * 60 * 1000;
const PERIOD_START = Date.UTC(2026, 6, 1);
const PERIOD_END = PERIOD_START + 30 * DAY;

const input = (overrides: Partial<ProrationQuoteInput> = {}): ProrationQuoteInput => ({
  userId: 'u1',
  subscriptionId: 'sub-1',
  currentPlanId: 'plan-pro',
  currentPlanSlug: 'pro',
  currentPriceVersionId: 'pv-pro',
  currentAmountMinor: 2000,
  targetPlanId: 'plan-team',
  targetPlanSlug: 'team',
  targetPriceVersionId: 'pv-team',
  targetAmountMinor: 3000,
  targetBillingInterval: 'MONTHLY' as ProrationQuoteInput['targetBillingInterval'],
  currency: 'USD',
  periodStartMs: PERIOD_START,
  periodEndMs: PERIOD_END,
  ...overrides,
});

describe('ProrationService', () => {
  let service: ProrationService;
  let repository: {
    create: jest.Mock;
    findById: jest.Mock;
    consumeIfActive: jest.Mock;
    markStatus: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      create: jest
        .fn()
        .mockImplementation((data: Record<string, unknown>) =>
          Promise.resolve({ id: 'q1', ...data }),
        ),
      findById: jest.fn(),
      consumeIfActive: jest.fn().mockResolvedValue(1),
      markStatus: jest.fn(),
    };
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      FX_QUOTE_TTL_MS: 600_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    service = new ProrationService(repository as unknown as ProrationQuoteRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('charges the exact prorated difference on an upgrade', async () => {
    // The spec's worked example: $20/mo -> $30/mo, one day into a 30-day
    // period. remainingRatio = 29/30, so amountDue = (3000-2000)*29/30 = 967.
    const quote = await service.quote(input(), PERIOD_START + DAY);
    expect(quote.amountDueMinor).toBe(967);
  });

  it('charges nothing extra when upgrading at the very end of a period', async () => {
    const quote = await service.quote(input(), PERIOD_END - 1);
    expect(quote.amountDueMinor).toBe(0);
  });

  it('charges the full difference when upgrading at the period start', async () => {
    const quote = await service.quote(input(), PERIOD_START);
    expect(quote.amountDueMinor).toBe(1000);
  });

  it('never charges for a downgrade and schedules it for period end', async () => {
    // Downgrades preserve the entitlement the user already paid for; no cash
    // leaves the business without an explicit policy decision.
    const quote = await service.quote(
      input({ currentAmountMinor: 3000, targetAmountMinor: 2000 }),
      PERIOD_START + DAY,
    );
    expect(quote.amountDueMinor).toBe(0);
    expect(quote.isScheduledForPeriodEnd).toBe(true);
    expect(quote.scheduledEffectiveAtMs).toBe(PERIOD_END);
  });

  it('never produces a negative amount due', async () => {
    for (const day of [0, 1, 5, 15, 29]) {
      const quote = await service.quote(
        input({ currentAmountMinor: 5000, targetAmountMinor: 5000 }),
        PERIOD_START + day * DAY,
      );
      expect(quote.amountDueMinor).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps the remaining ratio as a scaled integer, never a float', async () => {
    const quote = await service.quote(input(), PERIOD_START + DAY);
    expect(Number.isInteger(quote.remainingRatioScaled)).toBe(true);
  });

  it('records the quote as ACTIVE so it can be consumed exactly once', async () => {
    await service.quote(input(), PERIOD_START + DAY);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: ProrationQuoteStatus.ACTIVE }),
    );
  });

  describe('consume', () => {
    const stored = (overrides: Record<string, unknown> = {}) => ({
      id: 'q1',
      subscriptionId: 'sub-1',
      targetPlanId: 'plan-team',
      targetPlanSlug: 'team',
      targetPlanPriceVersionId: 'pv-team',
      currency: 'USD',
      remainingRatioScaled: 966_667,
      unusedCurrentCreditMinor: 1933,
      targetRemainingChargeMinor: 2900,
      amountDueMinor: 967,
      isScheduledForPeriodEnd: false,
      scheduledEffectiveAt: null,
      status: ProrationQuoteStatus.ACTIVE,
      expiresAt: new Date(PERIOD_START + 600_000),
      ...overrides,
    });

    it('consumes an active, unexpired quote', async () => {
      repository.findById.mockResolvedValue(stored());
      const quote = await service.consume('q1', 'sub-1', PERIOD_START);
      expect(quote.amountDueMinor).toBe(967);
      expect(repository.consumeIfActive).toHaveBeenCalled();
    });

    it('refuses an expired quote rather than silently re-pricing', async () => {
      // The user confirmed a specific number; re-deriving it later would charge
      // something they never agreed to.
      repository.findById.mockResolvedValue(stored());
      await expect(service.consume('q1', 'sub-1', PERIOD_START + 700_000)).rejects.toThrow();
    });

    it('refuses a quote that was already consumed', async () => {
      repository.findById.mockResolvedValue(stored({ status: ProrationQuoteStatus.CONSUMED }));
      await expect(service.consume('q1', 'sub-1', PERIOD_START)).rejects.toThrow();
    });

    it('refuses a quote belonging to a different subscription', async () => {
      repository.findById.mockResolvedValue(stored({ subscriptionId: 'someone-else' }));
      await expect(service.consume('q1', 'sub-1', PERIOD_START)).rejects.toThrow();
    });

    it('refuses an unknown quote', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.consume('missing', 'sub-1', PERIOD_START)).rejects.toThrow();
    });

    it('lets exactly one of two concurrent confirms win', async () => {
      // The conditional update is the arbiter: the loser matches zero rows.
      repository.findById.mockResolvedValue(stored());
      repository.consumeIfActive.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      await expect(service.consume('q1', 'sub-1', PERIOD_START)).resolves.toBeDefined();
      await expect(service.consume('q1', 'sub-1', PERIOD_START)).rejects.toThrow();
    });
  });

  describe('requiresPayment', () => {
    it('is false for a scheduled downgrade', () => {
      expect(
        ProrationService.requiresPayment({
          isScheduledForPeriodEnd: true,
          amountDueMinor: 0,
        } as ReturnType<typeof Object>['prototype']),
      ).toBe(false);
    });

    it('is false for a zero amount, so no zero-value gateway order is created', () => {
      expect(
        ProrationService.requiresPayment({
          isScheduledForPeriodEnd: false,
          amountDueMinor: 0,
        } as ReturnType<typeof Object>['prototype']),
      ).toBe(false);
    });

    it('is true for a real upgrade charge', () => {
      expect(
        ProrationService.requiresPayment({
          isScheduledForPeriodEnd: false,
          amountDueMinor: 967,
        } as ReturnType<typeof Object>['prototype']),
      ).toBe(true);
    });
  });
});

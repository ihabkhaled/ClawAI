import { describe, expect, it } from 'vitest';

import {
  BillingGateway,
  BillingInterval,
  SubscriptionStatus,
  UsageTone,
} from '@/enums/billing.enum';
import type { BillingPlan, CurrentSubscription, UsageWindow } from '@/types/billing.types';
import {
  computeUsageRatio,
  computeUsageWindowPercent,
  bpsToPercentInput,
  computeIntervalDiscountPercent,
  computeYearlySavingMinor,
  findPlanPrice,
  parseDiscountPercentToBps,
  formatMinorAmount,
  parseMajorAmountToMinor,
  formatQuotaLimit,
  isCurrentPlan,
  isSubscriptionEntitling,
  parseBillingGateway,
  readCheckoutInterval,
  resolveUsageTone,
} from '@/utilities/billing.utility';

function makePlan(overrides: Partial<BillingPlan> = {}): BillingPlan {
  return {
    id: 'plan-1',
    slug: 'pro',
    name: 'Pro',
    description: null,
    displayOrder: 1,
    isDefault: false,
    prices: [],
    dailyTokenQuota: null,
    weeklyTokenQuota: null,
    monthlyTokenQuota: null,
    maxChatsPerDay: null,
    maxMessagesPerDay: null,
    maxWorkspaceConnections: null,
    maxContextPacks: null,
    maxMemoryItems: null,
    features: [],
    ...overrides,
  };
}

function makeWindow(used: number, limit: number | null): UsageWindow {
  return { used, limit, remaining: limit === null ? null : limit - used, periodKey: 'p' };
}

const translate = (key: string): string => key;

describe('formatMinorAmount', () => {
  it('renders a two-decimal currency from integer minor units', () => {
    expect(formatMinorAmount(1999, 'USD', 'en-US')).toBe('$19.99');
  });

  it('does not divide a zero-decimal currency by 100', () => {
    // JPY has no minor unit. Dividing by 100 here would render ¥5,000 as ¥50 —
    // a hundredfold understatement of the price on the checkout screen.
    expect(formatMinorAmount(5000, 'JPY', 'en-US')).toBe('¥5,000');
  });

  it('falls back to a plain amount for an unknown currency code', () => {
    expect(formatMinorAmount(1000, 'ZZZ', 'en-US')).toContain('ZZZ');
  });

  it('renders zero as a real amount, not as blank', () => {
    expect(formatMinorAmount(0, 'USD', 'en-US')).toBe('$0.00');
  });
});

describe('parseMajorAmountToMinor', () => {
  it('converts decimal input without floating-point arithmetic', () => {
    expect(parseMajorAmountToMinor('19.99', 'USD')).toBe(1999);
    expect(parseMajorAmountToMinor('5000', 'JPY')).toBe(5000);
  });

  it('rejects zero, excessive precision, and unsafe values', () => {
    expect(parseMajorAmountToMinor('0', 'USD')).toBeNull();
    expect(parseMajorAmountToMinor('1.999', 'USD')).toBeNull();
    expect(parseMajorAmountToMinor('999999999999999999999', 'USD')).toBeNull();
  });
});

describe('computeUsageRatio', () => {
  it('returns null for an unlimited window', () => {
    expect(computeUsageRatio(500, null)).toBeNull();
  });

  it('treats a zero limit as fully consumed, not as unlimited', () => {
    // 0 means the feature is disabled on this plan. Reporting an empty bar
    // would tell the user they have room they do not have.
    expect(computeUsageRatio(0, 0)).toBe(1);
  });

  it('clamps overage at 1', () => {
    expect(computeUsageRatio(150, 100)).toBe(1);
  });

  it('computes a partial ratio', () => {
    expect(computeUsageRatio(25, 100)).toBe(0.25);
  });
});

describe('resolveUsageTone', () => {
  it('maps null to unlimited', () => {
    expect(resolveUsageTone(null)).toBe(UsageTone.UNLIMITED);
  });

  it('warns at the threshold, not after it', () => {
    expect(resolveUsageTone(0.8)).toBe(UsageTone.WARNING);
    expect(resolveUsageTone(0.79)).toBe(UsageTone.NORMAL);
  });

  it('marks a full window exhausted', () => {
    expect(resolveUsageTone(1)).toBe(UsageTone.EXHAUSTED);
  });
});

describe('computeUsageWindowPercent', () => {
  it('reports 0 for an unlimited window', () => {
    expect(computeUsageWindowPercent(makeWindow(900, null))).toBe(0);
  });

  it('rounds to a whole percent', () => {
    expect(computeUsageWindowPercent(makeWindow(1, 3))).toBe(33);
  });
});

describe('formatQuotaLimit', () => {
  it('keeps unlimited and disabled distinct', () => {
    expect(formatQuotaLimit(null, translate)).toBe('billing.quota.unlimited');
    expect(formatQuotaLimit(0, translate)).toBe('billing.quota.disabled');
  });

  it('formats a real limit', () => {
    expect(formatQuotaLimit(1000, translate)).toBe((1000).toLocaleString());
  });
});

describe('readCheckoutInterval', () => {
  it('parses every known interval, case-sensitively lowercase', () => {
    expect(readCheckoutInterval('monthly')).toBe(BillingInterval.MONTHLY);
    expect(readCheckoutInterval('quarterly')).toBe(BillingInterval.QUARTERLY);
    expect(readCheckoutInterval('semiannual')).toBe(BillingInterval.SEMIANNUAL);
    expect(readCheckoutInterval('yearly')).toBe(BillingInterval.YEARLY);
  });

  it('falls back to MONTHLY for null or an unrecognized value', () => {
    expect(readCheckoutInterval(null)).toBe(BillingInterval.MONTHLY);
    expect(readCheckoutInterval('weekly')).toBe(BillingInterval.MONTHLY);
  });
});

describe('findPlanPrice', () => {
  const plan = makePlan({
    prices: [
      {
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 1000,
        planPriceVersionId: 'v1',
      },
    ],
  });

  it('finds the price for the requested interval', () => {
    expect(findPlanPrice(plan, BillingInterval.MONTHLY)?.amountMinor).toBe(1000);
  });

  it('returns null rather than a wrong-interval price', () => {
    expect(findPlanPrice(plan, BillingInterval.YEARLY)).toBeNull();
  });
});

describe('findPlanPrice with QUARTERLY/SEMIANNUAL', () => {
  it('finds a QUARTERLY price row when present', () => {
    const plan = makePlan({
      prices: [
        {
          billingInterval: BillingInterval.MONTHLY,
          currency: 'USD',
          amountMinor: 1000,
          planPriceVersionId: 'p1',
        },
        {
          billingInterval: BillingInterval.QUARTERLY,
          currency: 'USD',
          amountMinor: 2700,
          planPriceVersionId: 'p2',
        },
      ],
    });
    expect(findPlanPrice(plan, BillingInterval.QUARTERLY)?.amountMinor).toBe(2700);
  });

  it('returns null when a plan has no SEMIANNUAL row', () => {
    const plan = makePlan({ prices: [] });
    expect(findPlanPrice(plan, BillingInterval.SEMIANNUAL)).toBeNull();
  });
});

describe('computeYearlySavingMinor', () => {
  it('computes the saving against twelve monthly payments', () => {
    const plan = makePlan({
      prices: [
        {
          billingInterval: BillingInterval.MONTHLY,
          currency: 'USD',
          amountMinor: 1000,
          planPriceVersionId: 'm',
        },
        {
          billingInterval: BillingInterval.YEARLY,
          currency: 'USD',
          amountMinor: 10000,
          planPriceVersionId: 'y',
        },
      ],
    });
    expect(computeYearlySavingMinor(plan)).toBe(2000);
  });

  it('never advertises a negative discount', () => {
    const plan = makePlan({
      prices: [
        {
          billingInterval: BillingInterval.MONTHLY,
          currency: 'USD',
          amountMinor: 100,
          planPriceVersionId: 'm',
        },
        {
          billingInterval: BillingInterval.YEARLY,
          currency: 'USD',
          amountMinor: 9999,
          planPriceVersionId: 'y',
        },
      ],
    });
    expect(computeYearlySavingMinor(plan)).toBe(0);
  });

  it('refuses to compare across currencies', () => {
    const plan = makePlan({
      prices: [
        {
          billingInterval: BillingInterval.MONTHLY,
          currency: 'USD',
          amountMinor: 1000,
          planPriceVersionId: 'm',
        },
        {
          billingInterval: BillingInterval.YEARLY,
          currency: 'EGP',
          amountMinor: 10000,
          planPriceVersionId: 'y',
        },
      ],
    });
    expect(computeYearlySavingMinor(plan)).toBe(0);
  });
});

describe('parseBillingGateway', () => {
  it('accepts a known gateway', () => {
    expect(parseBillingGateway('PAYPAL')).toBe(BillingGateway.PAYPAL);
  });

  it('fails closed on anything else', () => {
    expect(parseBillingGateway('BANK_TRANSFER')).toBeNull();
    expect(parseBillingGateway('')).toBeNull();
  });
});

describe('isCurrentPlan / isSubscriptionEntitling', () => {
  const subscription: CurrentSubscription = {
    id: 's1',
    planId: 'plan-1',
    planSlug: 'pro',
    planName: 'Pro',
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.MONTHLY,
    currency: 'USD',
    amountMinor: 1000,
    currentPeriodStart: '2026-07-01T00:00:00.000Z',
    currentPeriodEnd: '2026-08-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    gracePeriodEndsAt: null,
    scheduledPlanSlug: null,
    scheduledEffectiveAt: null,
  };

  it('matches on plan id', () => {
    expect(isCurrentPlan(makePlan(), subscription)).toBe(true);
    expect(isCurrentPlan(makePlan({ id: 'other' }), subscription)).toBe(false);
  });

  it('treats no subscription as no current plan', () => {
    expect(isCurrentPlan(makePlan(), null)).toBe(false);
    expect(isSubscriptionEntitling(null)).toBe(false);
  });

  it('still entitles a subscription that is ending or past due', () => {
    // A user mid-grace-period has paid and must keep working. Treating
    // PAST_DUE as unentitled here would send them through checkout again.
    expect(
      isSubscriptionEntitling({ ...subscription, status: SubscriptionStatus.CANCEL_AT_PERIOD_END }),
    ).toBe(true);
    expect(isSubscriptionEntitling({ ...subscription, status: SubscriptionStatus.PAST_DUE })).toBe(
      true,
    );
  });

  it('does not entitle a cancelled or suspended subscription', () => {
    expect(isSubscriptionEntitling({ ...subscription, status: SubscriptionStatus.CANCELLED })).toBe(
      false,
    );
    expect(isSubscriptionEntitling({ ...subscription, status: SubscriptionStatus.SUSPENDED })).toBe(
      false,
    );
  });
});

describe('computeIntervalDiscountPercent', () => {
  const priced = (
    entries: Array<[BillingInterval, number, string?]>,
  ): Parameters<typeof computeIntervalDiscountPercent>[0] => ({
    prices: entries.map(([billingInterval, amountMinor, currency = 'USD']) => ({
      billingInterval,
      amountMinor,
      currency,
    })),
  });

  it('reads 10 / 15 / 20 percent off the stored prices', () => {
    const plan = priced([
      [BillingInterval.MONTHLY, 1200],
      [BillingInterval.QUARTERLY, 3240],
      [BillingInterval.SEMIANNUAL, 6120],
      [BillingInterval.YEARLY, 11520],
    ]);

    expect(computeIntervalDiscountPercent(plan, BillingInterval.QUARTERLY)).toBe(10);
    expect(computeIntervalDiscountPercent(plan, BillingInterval.SEMIANNUAL)).toBe(15);
    expect(computeIntervalDiscountPercent(plan, BillingInterval.YEARLY)).toBe(20);
  });

  it('follows an admin-changed price instead of a constant', () => {
    const plan = priced([
      [BillingInterval.MONTHLY, 1000],
      [BillingInterval.YEARLY, 9000],
    ]);

    expect(computeIntervalDiscountPercent(plan, BillingInterval.YEARLY)).toBe(25);
  });

  it('rounds down so a half-percent discount never overstates', () => {
    // 12.5% off: 12 x 1000 x 0.875 = 10500.
    const plan = priced([
      [BillingInterval.MONTHLY, 1000],
      [BillingInterval.YEARLY, 10500],
    ]);

    expect(computeIntervalDiscountPercent(plan, BillingInterval.YEARLY)).toBe(12);
  });

  it('is 0 for MONTHLY, a missing price, another currency, a free plan or no saving', () => {
    const plan = priced([
      [BillingInterval.MONTHLY, 1000],
      [BillingInterval.QUARTERLY, 3000, 'EUR'],
      [BillingInterval.YEARLY, 12000],
    ]);

    expect(computeIntervalDiscountPercent(plan, BillingInterval.MONTHLY)).toBe(0);
    expect(computeIntervalDiscountPercent(plan, BillingInterval.SEMIANNUAL)).toBe(0);
    expect(computeIntervalDiscountPercent(plan, BillingInterval.QUARTERLY)).toBe(0);
    expect(computeIntervalDiscountPercent(plan, BillingInterval.YEARLY)).toBe(0);
    expect(
      computeIntervalDiscountPercent(
        priced([
          [BillingInterval.MONTHLY, 0],
          [BillingInterval.YEARLY, 0],
        ]),
        BillingInterval.YEARLY,
      ),
    ).toBe(0);
  });
});

describe('discount percent input', () => {
  it.each([
    ['20', 2000],
    ['12.5', 1250],
    ['0', 0],
    ['90', 9000],
    [' 15 ', 1500],
    ['0.01', 1],
  ])('parses %j to %d basis points', (input, bps) => {
    expect(parseDiscountPercentToBps(input)).toBe(bps);
  });

  it.each(['', 'abc', '91', '90.01', '-1', '12.345', '1e2'])('rejects %j', (input) => {
    expect(parseDiscountPercentToBps(input)).toBeNull();
  });

  it('round-trips basis points to the text an admin edits', () => {
    expect(bpsToPercentInput(2000)).toBe('20');
    expect(bpsToPercentInput(1250)).toBe('12.5');
    expect(parseDiscountPercentToBps(bpsToPercentInput(1250))).toBe(1250);
  });
});

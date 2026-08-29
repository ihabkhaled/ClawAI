import { describe, expect, it } from 'vitest';

import { BillingInterval } from '@/enums/billing.enum';
import {
  filterPublicPlans,
  formatPlanPrice,
  formatPriceDecimal,
  formatPlanQuota,
  resolvePlanPrice,
} from '@/utilities/pricing-catalog.utility';

const plans = [
  {
    id: 'plan-free',
    slug: 'free',
    name: 'Free',
    description: null,
    displayOrder: 1,
    isDefault: true,
    isPopular: false,
    dailyTokenQuota: 0,
    weeklyTokenQuota: null,
    monthlyTokenQuota: null,
    monthlyProviderCostCeilingMicroUsd: null,
    maxChatsPerDay: 0,
    maxMessagesPerDay: null,
    maxWorkspaceConnections: 1,
    maxContextPacks: 0,
    maxMemoryItems: null,
    prices: [
      {
        id: 'price-free',
        planId: 'plan-free',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 0,
        version: 1,
        isActive: true,
      },
    ],
    features: [],
  },
  {
    id: 'plan-pro',
    slug: 'pro',
    name: 'Pro',
    description: 'For sustained work',
    displayOrder: 2,
    isDefault: false,
    isPopular: false,
    dailyTokenQuota: 250_000,
    weeklyTokenQuota: null,
    monthlyTokenQuota: 4_000_000,
    monthlyProviderCostCeilingMicroUsd: null,
    maxChatsPerDay: null,
    maxMessagesPerDay: null,
    maxWorkspaceConnections: 5,
    maxContextPacks: 20,
    maxMemoryItems: 1_000,
    prices: [
      {
        id: 'price-pro-monthly',
        planId: 'plan-pro',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 2_099,
        version: 3,
        isActive: true,
      },
      {
        id: 'price-pro-yearly',
        planId: 'plan-pro',
        billingInterval: BillingInterval.YEARLY,
        currency: 'USD',
        amountMinor: 20_000,
        version: 2,
        isActive: true,
      },
    ],
    features: [],
  },
] as const;

describe('pricing catalog utility', () => {
  it('formats integer minor-unit prices without floating-point arithmetic', () => {
    expect(formatPlanPrice(plans[1].prices[0], 'en-US')).toBe('$20.99');
    expect(formatPlanPrice(plans[0].prices[0], 'en-US')).toBe('$0.00');
    expect(formatPriceDecimal(plans[1].prices[0])).toBe('20.99');
  });

  it('keeps disabled and unlimited quota semantics distinct', () => {
    expect(formatPlanQuota(0, 'Disabled', 'Unlimited', 'en-US')).toBe('Disabled');
    expect(formatPlanQuota(null, 'Disabled', 'Unlimited', 'en-US')).toBe('Unlimited');
    expect(formatPlanQuota(250_000, 'Disabled', 'Unlimited', 'en-US')).toBe('250,000');
  });

  it('resolves the requested immutable active price version', () => {
    expect(resolvePlanPrice(plans[1], true)?.id).toBe('price-pro-yearly');
    expect(resolvePlanPrice(plans[1], false)?.id).toBe('price-pro-monthly');
    expect(resolvePlanPrice(plans[0], true)).toBeNull();
  });

  it('uses the canonical compact plan set and preserves catalog order', () => {
    expect(filterPublicPlans(plans, true).map((plan) => plan.slug)).toEqual(['free', 'pro']);
    expect(filterPublicPlans(plans, false)).toEqual(plans);
  });
});

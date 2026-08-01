import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PUBLIC_PRICING_FALLBACK_PLANS } from '@/constants/public-pricing-fallback.constants';
import { BillingInterval } from '@/enums/billing.enum';

type SeedPlan = {
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
  isDefault: boolean;
  monthlyMinor: number;
  yearlyMinor: number | null;
  dailyTokens: number | null;
  weeklyTokens: number | null;
  monthlyTokens: number | null;
  chatsPerDay: number | null;
  messagesPerDay: number | null;
  workspaces: number | null;
  contextPacks: number | null;
  memoryItems: number | null;
};

type SeedCatalog = { plans: SeedPlan[] };

describe('PUBLIC_PRICING_FALLBACK_PLANS', () => {
  it('matches the canonical auth seed for every public price and quota', () => {
    const seedPath = path.resolve(
      process.cwd(),
      '../claw-auth-service/prisma/seeders/plan-catalog.json',
    );
    const catalog = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedCatalog;

    expect(PUBLIC_PRICING_FALLBACK_PLANS).toHaveLength(catalog.plans.length);
    for (const seedPlan of catalog.plans) {
      const fallback = PUBLIC_PRICING_FALLBACK_PLANS.find(
        (candidate) => candidate.slug === seedPlan.slug,
      );
      expect(fallback).toMatchObject({
        name: seedPlan.name,
        description: seedPlan.description,
        displayOrder: seedPlan.displayOrder,
        isDefault: seedPlan.isDefault,
        dailyTokenQuota: seedPlan.dailyTokens,
        weeklyTokenQuota: seedPlan.weeklyTokens,
        monthlyTokenQuota: seedPlan.monthlyTokens,
        maxChatsPerDay: seedPlan.chatsPerDay,
        maxMessagesPerDay: seedPlan.messagesPerDay,
        maxWorkspaceConnections: seedPlan.workspaces,
        maxContextPacks: seedPlan.contextPacks,
        maxMemoryItems: seedPlan.memoryItems,
      });
      expect(
        fallback?.prices.find((price) => price.billingInterval === BillingInterval.MONTHLY),
      ).toMatchObject({ amountMinor: seedPlan.monthlyMinor, currency: 'USD', isActive: true });
      if (seedPlan.yearlyMinor === null) {
        expect(
          fallback?.prices.find((price) => price.billingInterval === BillingInterval.YEARLY),
        ).toBeUndefined();
      } else {
        expect(
          fallback?.prices.find((price) => price.billingInterval === BillingInterval.YEARLY),
        ).toMatchObject({ amountMinor: seedPlan.yearlyMinor, currency: 'USD', isActive: true });
      }
    }
  });
});

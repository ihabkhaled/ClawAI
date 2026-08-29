import { BillingInterval } from '@/enums/billing.enum';
import type { PublicPlan } from '@/types/public-pricing.types';

export const PUBLIC_PRICING_FALLBACK_PLANS: PublicPlan[] = [
  {
    id: 'fallback-free',
    slug: 'free',
    name: 'Free',
    description: 'Try every frontier model with a small daily allowance.',
    displayOrder: 0,
    isDefault: true,
    isPopular: false,
    // Weekly is six times daily, the ratio every other tier uses. The pair
    // shipped as 300,000 daily against 20,000 weekly, which the card rendered
    // as an allowance fifteen times what the account actually granted — the
    // weekly ceiling binds on the first afternoon.
    dailyTokenQuota: 20_000,
    weeklyTokenQuota: 120_000,
    monthlyTokenQuota: null,
    // The share of this plan's monthly price that becomes connector credit, in
    // basis points. Mirrors the seeded catalog. The card DERIVES the dollar
    // figure from the price beside it, so a stale fallback price and its credit
    // can never disagree — and free, priced at $0, derives $0.
    paygCreditPercentBps: 3000,
    maxChatsPerDay: 5,
    maxMessagesPerDay: 250,
    maxWorkspaceConnections: 5,
    maxContextPacks: 10,
    maxMemoryItems: 10,
    prices: [
      {
        id: 'fallback-free-monthly',
        planId: 'fallback-free',
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
    id: 'fallback-starter',
    slug: 'starter',
    name: 'Starter',
    description: 'Everyday access to fast, low-cost frontier models.',
    displayOrder: 1,
    isDefault: false,
    isPopular: false,
    dailyTokenQuota: 50_000,
    weeklyTokenQuota: 250_000,
    monthlyTokenQuota: 750_000,
    // The share of this plan's monthly price that becomes connector credit, in
    // basis points. Mirrors the seeded catalog. The card DERIVES the dollar
    // figure from the price beside it, so a stale fallback price and its credit
    // can never disagree — and free, priced at $0, derives $0.
    paygCreditPercentBps: 3000,
    maxChatsPerDay: 10,
    maxMessagesPerDay: 100,
    maxWorkspaceConnections: 1,
    maxContextPacks: 5,
    maxMemoryItems: 50,
    prices: [
      {
        id: 'fallback-starter-monthly',
        planId: 'fallback-starter',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 500,
        version: 1,
        isActive: true,
      },
      {
        id: 'fallback-starter-yearly',
        planId: 'fallback-starter',
        billingInterval: BillingInterval.YEARLY,
        currency: 'USD',
        amountMinor: 5_000,
        version: 1,
        isActive: true,
      },
    ],
    features: [],
  },
  {
    id: 'fallback-plus',
    slug: 'plus',
    name: 'Plus',
    description: 'More allowance and access to standard-tier models.',
    displayOrder: 2,
    isDefault: false,
    isPopular: false,
    dailyTokenQuota: 100_000,
    weeklyTokenQuota: 600_000,
    monthlyTokenQuota: 1_750_000,
    // The share of this plan's monthly price that becomes connector credit, in
    // basis points. Mirrors the seeded catalog. The card DERIVES the dollar
    // figure from the price beside it, so a stale fallback price and its credit
    // can never disagree — and free, priced at $0, derives $0.
    paygCreditPercentBps: 3000,
    maxChatsPerDay: 25,
    maxMessagesPerDay: 250,
    maxWorkspaceConnections: 2,
    maxContextPacks: 15,
    maxMemoryItems: 200,
    prices: [
      {
        id: 'fallback-plus-monthly',
        planId: 'fallback-plus',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 1_000,
        version: 1,
        isActive: true,
      },
      {
        id: 'fallback-plus-yearly',
        planId: 'fallback-plus',
        billingInterval: BillingInterval.YEARLY,
        currency: 'USD',
        amountMinor: 10_000,
        version: 1,
        isActive: true,
      },
    ],
    features: [],
  },
  {
    id: 'fallback-pro',
    slug: 'pro',
    name: 'Pro',
    description: 'Premium models, deep reasoning and heavy orchestration.',
    displayOrder: 3,
    isDefault: false,
    // Matches the migration backfill, so the badge is in the same place whether
    // the page renders live plans or this offline fallback.
    isPopular: true,
    dailyTokenQuota: 250_000,
    weeklyTokenQuota: 1_500_000,
    monthlyTokenQuota: 4_000_000,
    // The share of this plan's monthly price that becomes connector credit, in
    // basis points. Mirrors the seeded catalog. The card DERIVES the dollar
    // figure from the price beside it, so a stale fallback price and its credit
    // can never disagree — and free, priced at $0, derives $0.
    paygCreditPercentBps: 2500,
    maxChatsPerDay: 75,
    maxMessagesPerDay: 750,
    maxWorkspaceConnections: 5,
    maxContextPacks: 50,
    maxMemoryItems: 1_000,
    prices: [
      {
        id: 'fallback-pro-monthly',
        planId: 'fallback-pro',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 2_000,
        version: 1,
        isActive: true,
      },
      {
        id: 'fallback-pro-yearly',
        planId: 'fallback-pro',
        billingInterval: BillingInterval.YEARLY,
        currency: 'USD',
        amountMinor: 20_000,
        version: 1,
        isActive: true,
      },
    ],
    features: [],
  },
  {
    id: 'fallback-team',
    slug: 'team',
    name: 'Team',
    description: 'Shared workspaces and a large pooled allowance.',
    displayOrder: 4,
    isDefault: false,
    isPopular: false,
    dailyTokenQuota: 750_000,
    weeklyTokenQuota: 4_000_000,
    monthlyTokenQuota: 11_000_000,
    // The share of this plan's monthly price that becomes connector credit, in
    // basis points. Mirrors the seeded catalog. The card DERIVES the dollar
    // figure from the price beside it, so a stale fallback price and its credit
    // can never disagree — and free, priced at $0, derives $0.
    paygCreditPercentBps: 2500,
    maxChatsPerDay: 250,
    maxMessagesPerDay: 2_500,
    maxWorkspaceConnections: 15,
    maxContextPacks: 200,
    maxMemoryItems: 5_000,
    prices: [
      {
        id: 'fallback-team-monthly',
        planId: 'fallback-team',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 5_000,
        version: 1,
        isActive: true,
      },
      {
        id: 'fallback-team-yearly',
        planId: 'fallback-team',
        billingInterval: BillingInterval.YEARLY,
        currency: 'USD',
        amountMinor: 50_000,
        version: 1,
        isActive: true,
      },
    ],
    features: [],
  },
  {
    id: 'fallback-scale',
    slug: 'scale',
    name: 'Scale',
    description: 'High-volume access across every model class.',
    displayOrder: 5,
    isDefault: false,
    isPopular: false,
    dailyTokenQuota: 1_500_000,
    weeklyTokenQuota: 9_000_000,
    monthlyTokenQuota: 24_000_000,
    // The share of this plan's monthly price that becomes connector credit, in
    // basis points. Mirrors the seeded catalog. The card DERIVES the dollar
    // figure from the price beside it, so a stale fallback price and its credit
    // can never disagree — and free, priced at $0, derives $0.
    paygCreditPercentBps: 2500,
    maxChatsPerDay: 1_000,
    maxMessagesPerDay: 10_000,
    maxWorkspaceConnections: 50,
    maxContextPacks: 1_000,
    maxMemoryItems: 25_000,
    prices: [
      {
        id: 'fallback-scale-monthly',
        planId: 'fallback-scale',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 10_000,
        version: 1,
        isActive: true,
      },
      {
        id: 'fallback-scale-yearly',
        planId: 'fallback-scale',
        billingInterval: BillingInterval.YEARLY,
        currency: 'USD',
        amountMinor: 100_000,
        version: 1,
        isActive: true,
      },
    ],
    features: [],
  },
  {
    id: 'fallback-unlimited',
    slug: 'unlimited',
    name: 'Unlimited',
    description: 'Unlimited chats and messages, with fair-use on premium cloud.',
    displayOrder: 6,
    isDefault: false,
    isPopular: false,
    dailyTokenQuota: 5_000_000,
    weeklyTokenQuota: 30_000_000,
    monthlyTokenQuota: null,
    // The share of this plan's monthly price that becomes connector credit, in
    // basis points. Mirrors the seeded catalog. The card DERIVES the dollar
    // figure from the price beside it, so a stale fallback price and its credit
    // can never disagree — and free, priced at $0, derives $0.
    paygCreditPercentBps: 2500,
    maxChatsPerDay: null,
    maxMessagesPerDay: null,
    maxWorkspaceConnections: 200,
    maxContextPacks: 5_000,
    maxMemoryItems: 100_000,
    prices: [
      {
        id: 'fallback-unlimited-monthly',
        planId: 'fallback-unlimited',
        billingInterval: BillingInterval.MONTHLY,
        currency: 'USD',
        amountMinor: 20_000,
        version: 1,
        isActive: true,
      },
      {
        id: 'fallback-unlimited-yearly',
        planId: 'fallback-unlimited',
        billingInterval: BillingInterval.YEARLY,
        currency: 'USD',
        amountMinor: 200_000,
        version: 1,
        isActive: true,
      },
    ],
    features: [],
  },
];

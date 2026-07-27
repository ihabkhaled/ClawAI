import { BillingDashboardService } from '../billing-dashboard.service';
import type { ProviderCostClient } from '../../clients/provider-cost.client';
import type { BillingDashboardRepository } from '../../repositories/billing-dashboard.repository';

describe('BillingDashboardService', () => {
  it('combines ledger revenue, provider cost, subscriptions, churn and failures', async () => {
    const repository = {
      transactionMetrics: jest.fn().mockResolvedValue([
        {
          currency: 'USD',
          type: 'CHARGE',
          status: 'CAPTURED',
          amountMinor: 2_000,
          count: 1,
        },
        {
          currency: 'USD',
          type: 'REFUND',
          status: 'REFUNDED',
          amountMinor: -500,
          count: 1,
        },
        {
          currency: 'EGP',
          type: 'CHARGE',
          status: 'CAPTURED',
          amountMinor: 10_000,
          count: 1,
        },
      ]),
      subscriptionMetrics: jest.fn().mockResolvedValue([
        {
          planId: 'plan-pro',
          planSlug: 'pro',
          planPriceVersionId: 'price-v2',
          status: 'ACTIVE',
          count: 9,
        },
      ]),
      countChurned: jest.fn().mockResolvedValue(1),
      countFailedPayments: jest.fn().mockResolvedValue(3),
    };
    const providerCosts = {
      aggregate: jest.fn().mockResolvedValue([{ planId: 'plan-pro', costMicroUsd: '5000000' }]),
    };
    const service = new BillingDashboardService(
      repository as unknown as BillingDashboardRepository,
      providerCosts as unknown as ProviderCostClient,
    );

    const dashboard = await service.getDashboard(30, new Date('2026-07-27T00:00:00.000Z'));

    expect(dashboard.revenueByCurrency).toEqual([
      { currency: 'EGP', amountMinor: 10_000 },
      { currency: 'USD', amountMinor: 1_500 },
    ]);
    expect(dashboard.revenueMicroUsd).toBe('15000000');
    expect(dashboard.providerCostMicroUsd).toBe('5000000');
    expect(dashboard.marginMicroUsd).toBe('10000000');
    expect(dashboard.churnBasisPoints).toBe(1_000);
    expect(dashboard.failedPayments).toBe(3);
  });

  it('returns zero churn when there is no population', async () => {
    const repository = {
      transactionMetrics: jest.fn().mockResolvedValue([]),
      subscriptionMetrics: jest.fn().mockResolvedValue([]),
      countChurned: jest.fn().mockResolvedValue(0),
      countFailedPayments: jest.fn().mockResolvedValue(0),
    };
    const providerCosts = { aggregate: jest.fn().mockResolvedValue([]) };
    const service = new BillingDashboardService(
      repository as unknown as BillingDashboardRepository,
      providerCosts as unknown as ProviderCostClient,
    );

    const dashboard = await service.getDashboard(30);

    expect(dashboard.churnBasisPoints).toBe(0);
    expect(dashboard.marginMicroUsd).toBe('0');
  });
});

import { Injectable } from '@nestjs/common';
import {
  calculateMarginMicroUsd,
  sumMicroUsd,
  sumMinor,
  usdMinorToMicroUsd,
} from '@claw/shared-utilities';

import { ProviderCostClient } from '../clients/provider-cost.client';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  BILLING_DASHBOARD_BASIS_POINTS,
  BILLING_DASHBOARD_DAY_MS,
} from '../constants/billing-dashboard.constants';
import { BillingDashboardRepository } from '../repositories/billing-dashboard.repository';
import {
  type BillingDashboardView,
  type PriceVersionSubscriberCount,
  type TransactionMetricRow,
} from '../types/billing-dashboard.types';

@Injectable()
export class BillingDashboardService {
  constructor(
    private readonly repository: BillingDashboardRepository,
    private readonly providerCosts: ProviderCostClient,
  ) {}

  async getDashboard(days: number, now = new Date()): Promise<BillingDashboardView> {
    const from = new Date(now.getTime() - days * BILLING_DASHBOARD_DAY_MS);
    const [transactions, subscriptions, churnedSubscriptions, failedPayments, costs] =
      await Promise.all([
        this.repository.transactionMetrics(from),
        this.repository.subscriptionMetrics(),
        this.repository.countChurned(from),
        this.repository.countFailedPayments(from),
        this.providerCosts.aggregate(from),
      ]);
    const revenueByCurrency = this.revenueByCurrency(transactions);
    const usdRevenueMinor =
      revenueByCurrency.find((row) => row.currency === 'USD')?.amountMinor ?? 0;
    const revenueMicroUsd = usdMinorToMicroUsd(usdRevenueMinor);
    const providerCostMicroUsd = sumMicroUsd(costs.map((row) => BigInt(row.costMicroUsd)));
    const activeSubscriptions = subscriptions
      .filter((row) => ACTIVE_SUBSCRIPTION_STATUSES.has(row.status))
      .reduce((total, row) => total + row.count, 0);
    const churnDenominator = activeSubscriptions + churnedSubscriptions;
    const churnBasisPoints =
      churnDenominator === 0
        ? 0
        : Number(
            (BigInt(churnedSubscriptions) * BigInt(BILLING_DASHBOARD_BASIS_POINTS)) /
              BigInt(churnDenominator),
          );

    return {
      from: from.toISOString(),
      to: now.toISOString(),
      revenueByCurrency,
      revenueMicroUsd: revenueMicroUsd.toString(),
      providerCostMicroUsd: providerCostMicroUsd.toString(),
      marginMicroUsd: calculateMarginMicroUsd(revenueMicroUsd, providerCostMicroUsd).toString(),
      subscriptionCounts: subscriptions,
      churnedSubscriptions,
      churnBasisPoints,
      failedPayments,
    };
  }

  async getPriceVersionSubscriberCounts(planId: string): Promise<PriceVersionSubscriberCount[]> {
    return this.repository.priceVersionSubscriberCounts(planId);
  }

  private revenueByCurrency(
    transactions: TransactionMetricRow[],
  ): Array<{ currency: string; amountMinor: number }> {
    const currencies = [...new Set(transactions.map((row) => row.currency))].sort();
    return currencies.map((currency) => ({
      currency,
      amountMinor: sumMinor(
        transactions.filter((row) => row.currency === currency).map((row) => row.amountMinor),
      ),
    }));
  }
}

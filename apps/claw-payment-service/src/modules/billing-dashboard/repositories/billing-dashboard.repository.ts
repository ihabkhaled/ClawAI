import { Injectable } from '@nestjs/common';
import { PaymentTransactionStatus, PaymentTransactionType } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type PriceVersionSubscriberCount,
  type SubscriptionMetricRow,
  type TransactionMetricRow,
} from '../types/billing-dashboard.types';

@Injectable()
export class BillingDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async transactionMetrics(from: Date): Promise<TransactionMetricRow[]> {
    const rows = await this.prisma.paymentTransaction.groupBy({
      by: ['currency', 'type', 'status'],
      where: {
        createdAt: { gte: from },
        OR: [
          {
            type: {
              in: [
                PaymentTransactionType.CHARGE,
                PaymentTransactionType.RENEWAL,
                PaymentTransactionType.PRORATION_CHARGE,
              ],
            },
            status: PaymentTransactionStatus.CAPTURED,
          },
          {
            type: {
              in: [PaymentTransactionType.REFUND, PaymentTransactionType.CHARGEBACK],
            },
            status: {
              in: [PaymentTransactionStatus.REFUNDED, PaymentTransactionStatus.REVERSED],
            },
          },
        ],
      },
      _sum: { amountMinor: true },
      _count: { _all: true },
    });
    return rows.map((row) => ({
      currency: row.currency,
      type: row.type,
      status: row.status,
      amountMinor: row._sum.amountMinor ?? 0,
      count: row._count._all,
    }));
  }

  async subscriptionMetrics(): Promise<SubscriptionMetricRow[]> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['planId', 'planSlug', 'planPriceVersionId', 'status'],
      _count: { _all: true },
      orderBy: [{ planSlug: 'asc' }, { status: 'asc' }],
    });
    return rows.map((row) => ({
      planId: row.planId,
      planSlug: row.planSlug,
      planPriceVersionId: row.planPriceVersionId,
      status: row.status,
      count: row._count._all,
    }));
  }

  async countChurned(from: Date): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        updatedAt: { gte: from },
        status: { in: ['CANCELLED', 'EXPIRED', 'REFUNDED', 'CHARGEBACK'] },
      },
    });
  }

  async countFailedPayments(from: Date): Promise<number> {
    return this.prisma.paymentTransaction.count({
      where: {
        createdAt: { gte: from },
        status: PaymentTransactionStatus.FAILED,
      },
    });
  }

  async priceVersionSubscriberCounts(planId: string): Promise<PriceVersionSubscriberCount[]> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['planPriceVersionId'],
      where: { planId },
      _count: { _all: true },
      orderBy: { planPriceVersionId: 'asc' },
    });
    return rows.map((row) => ({
      planPriceVersionId: row.planPriceVersionId,
      count: row._count._all,
    }));
  }
}

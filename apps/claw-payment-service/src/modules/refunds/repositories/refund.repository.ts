import { Injectable, Logger } from '@nestjs/common';
import { PaymentTransactionStatus, PaymentTransactionType } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type Prisma, RefundStatus } from '../../../generated/prisma';
import {
  type RefundableCharge,
  type RefundableChargeSummary,
  type RefundCompletionContext,
  type RefundRecord,
  type ReserveRefundInput,
} from '../types/refund.types';

@Injectable()
export class RefundRepository {
  private readonly logger = new Logger(RefundRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    requestedByUserId: string,
    idempotencyKey: string,
  ): Promise<RefundRecord | null> {
    return this.prisma.refund.findUnique({
      where: {
        requestedByUserId_idempotencyKey: { requestedByUserId, idempotencyKey },
      },
    });
  }

  async findByProviderRefundId(
    gateway: string,
    providerRefundId: string,
  ): Promise<RefundRecord | null> {
    return this.prisma.refund.findUnique({
      where: { gateway_providerRefundId: { gateway, providerRefundId } },
    });
  }

  async findCapturedCharge(id: string): Promise<RefundableCharge | null> {
    const charge = await this.prisma.paymentTransaction.findFirst({
      where: {
        id,
        type: {
          in: [
            PaymentTransactionType.CHARGE,
            PaymentTransactionType.RENEWAL,
            PaymentTransactionType.PRORATION_CHARGE,
          ],
        },
        status: PaymentTransactionStatus.CAPTURED,
        subscriptionId: { not: null },
        providerTransactionId: { not: null },
      },
    });
    if (charge === null) {
      return null;
    }
    if (charge.subscriptionId === null || charge.providerTransactionId === null) {
      return null;
    }
    return {
      id: charge.id,
      userId: charge.userId,
      subscriptionId: charge.subscriptionId,
      gateway: charge.gateway,
      amountMinor: charge.amountMinor,
      currency: charge.currency,
      providerTransactionId: charge.providerTransactionId,
    };
  }

  async listRefundableCharges(): Promise<RefundableChargeSummary[]> {
    const rows = await this.prisma.paymentTransaction.findMany({
      where: {
        type: {
          in: [
            PaymentTransactionType.CHARGE,
            PaymentTransactionType.RENEWAL,
            PaymentTransactionType.PRORATION_CHARGE,
          ],
        },
        status: PaymentTransactionStatus.CAPTURED,
        subscriptionId: { not: null },
        capturedAt: { not: null },
      },
      orderBy: { capturedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        userId: true,
        subscriptionId: true,
        gateway: true,
        amountMinor: true,
        currency: true,
        capturedAt: true,
        refunds: {
          where: { status: { in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED] } },
          select: { amountMinor: true },
        },
      },
    });
    return rows.flatMap((row) => {
      if (row.subscriptionId === null || row.capturedAt === null) {
        return [];
      }
      return [
        {
          id: row.id,
          userId: row.userId,
          subscriptionId: row.subscriptionId,
          gateway: row.gateway,
          amountMinor: row.amountMinor,
          currency: row.currency,
          capturedAt: row.capturedAt,
          reservedAmounts: row.refunds.map((refund) => refund.amountMinor),
        },
      ];
    });
  }

  async listReservedAmounts(paymentTransactionId: string): Promise<number[]> {
    const rows = await this.prisma.refund.findMany({
      where: {
        paymentTransactionId,
        status: { in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED] },
      },
      select: { amountMinor: true },
    });
    return rows.map((row) => row.amountMinor);
  }

  async reserve(input: ReserveRefundInput): Promise<RefundRecord> {
    this.logger.log(`reserve: transaction=${input.paymentTransactionId}`);
    return this.prisma.refund.create({
      data: {
        paymentTransactionId: input.paymentTransactionId,
        subscriptionId: input.charge.subscriptionId,
        invoiceId: null,
        userId: input.charge.userId,
        requestedByUserId: input.requestedByUserId,
        gateway: input.charge.gateway,
        status: RefundStatus.PENDING,
        amountMinor: input.amountMinor,
        currency: input.charge.currency,
        idempotencyKey: input.idempotencyKey,
        providerIdempotencyKey: input.providerIdempotencyKey,
        reason: input.reason,
      },
    });
  }

  async markProviderAccepted(id: string, providerRefundId: string): Promise<RefundRecord> {
    return this.prisma.refund.update({
      where: { id },
      data: { providerRefundId },
    });
  }

  async markFailed(id: string, failureCode: string): Promise<void> {
    await this.prisma.refund.update({
      where: { id },
      data: { status: RefundStatus.FAILED, failureCode },
    });
  }

  async findForCompletion(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<RefundCompletionContext | null> {
    const row = await tx.refund.findUnique({
      where: { id },
      include: { paymentTransaction: true, subscription: true },
    });
    if (row === null) {
      return null;
    }
    const { paymentTransaction, subscription, ...refund } = row;
    return { refund, charge: paymentTransaction, subscription };
  }

  async markSucceeded(
    tx: Prisma.TransactionClient,
    id: string,
    providerRefundId: string,
    completedAt: Date,
  ): Promise<RefundRecord> {
    return tx.refund.update({
      where: { id },
      data: {
        status: RefundStatus.SUCCEEDED,
        providerRefundId,
        failureCode: null,
        completedAt,
      },
    });
  }

  async sumSucceededAmount(
    tx: Prisma.TransactionClient,
    paymentTransactionId: string,
  ): Promise<number> {
    const aggregate = await tx.refund.aggregate({
      where: { paymentTransactionId, status: RefundStatus.SUCCEEDED },
      _sum: { amountMinor: true },
    });
    return aggregate._sum.amountMinor ?? 0;
  }
}

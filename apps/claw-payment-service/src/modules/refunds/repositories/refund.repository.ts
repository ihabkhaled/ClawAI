import { Injectable, Logger } from '@nestjs/common';
import { PaymentTransactionStatus, PaymentTransactionType } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type Prisma, RefundStatus } from '../../../generated/prisma';
import {
  type AutomaticCompensationInput,
  type PreparedAutomaticCompensation,
  type RefundableCharge,
  type RefundableChargeSummary,
  type RefundCompletionContext,
  type RefundRecord,
  type ReserveRefundInput,
} from '../types/refund.types';
import {
  AUTOMATIC_REFUND_ACTOR,
  AUTOMATIC_REFUND_RETRY_BASE_MS,
} from '../constants/payment-compensation.constants';
import { REFUNDABLE_CHARGE_TYPES } from '../constants/refundable-charge.constants';
import { toRefundableChargeType } from '../utilities/refundable-charge-type.utility';

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

  /**
   * A captured charge that may still be reversed.
   *
   * `subscriptionId` is NOT required non-null any more: a PAYG credit top-up is
   * a real captured charge that buys a balance rather than a plan, and refusing
   * to find it here would leave a refunded top-up with the money returned and
   * the credit still in the wallet.
   *
   * `providerTransactionId` is still required — a charge we cannot name at the
   * gateway cannot be refunded at the gateway either.
   */
  async findCapturedCharge(id: string): Promise<RefundableCharge | null> {
    const charge = await this.prisma.paymentTransaction.findFirst({
      where: {
        id,
        type: { in: [...REFUNDABLE_CHARGE_TYPES] },
        status: PaymentTransactionStatus.CAPTURED,
        providerTransactionId: { not: null },
      },
    });
    if (charge === null || charge.providerTransactionId === null) {
      return null;
    }
    const type = toRefundableChargeType(charge.type);
    if (type === null) {
      return null;
    }
    return {
      id: charge.id,
      userId: charge.userId,
      subscriptionId: charge.subscriptionId,
      type,
      gateway: charge.gateway,
      amountMinor: charge.amountMinor,
      currency: charge.currency,
      providerAmountMinor: charge.providerAmountMinor ?? charge.amountMinor,
      providerCurrency: charge.providerCurrency ?? charge.currency,
      providerTransactionId: charge.providerTransactionId,
    };
  }

  async listRefundableCharges(): Promise<RefundableChargeSummary[]> {
    const rows = await this.prisma.paymentTransaction.findMany({
      where: {
        // Deliberately NOT REFUNDABLE_CHARGE_TYPES: this feeds the operator's
        // refundable-transactions list, whose view contract still requires a
        // subscription id. Widening it is a separate, user-visible change.
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
        providerAmountMinor: true,
        providerCurrency: true,
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
          providerAmountMinor: row.providerAmountMinor ?? row.amountMinor,
          providerCurrency: row.providerCurrency ?? row.currency,
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

  async listReservedProviderAmounts(paymentTransactionId: string): Promise<number[]> {
    const rows = await this.prisma.refund.findMany({
      where: {
        paymentTransactionId,
        status: { in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED] },
      },
      select: { providerAmountMinor: true },
    });
    return rows.map((row) => row.providerAmountMinor);
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
        providerAmountMinor: input.providerAmountMinor,
        providerCurrency: input.providerCurrency,
        idempotencyKey: input.idempotencyKey,
        providerIdempotencyKey: input.providerIdempotencyKey,
        reason: input.reason,
      },
    });
  }

  async markProviderAccepted(id: string, providerRefundId: string): Promise<RefundRecord> {
    return this.prisma.refund.update({
      where: { id },
      data: {
        providerRefundId,
        failureCode: null,
        nextAttemptAt: null,
        attempts: { increment: 1 },
      },
    });
  }

  async prepareAutomaticCompensation(
    input: AutomaticCompensationInput,
  ): Promise<PreparedAutomaticCompensation> {
    return this.prisma.$transaction(async (tx) => {
      const existingCharge = await tx.paymentTransaction.findUnique({
        where: {
          gateway_providerTransactionId: {
            gateway: input.gateway,
            providerTransactionId: input.providerTransactionId,
          },
        },
      });
      const charge =
        existingCharge ??
        (await tx.paymentTransaction.create({
          data: {
            userId: input.userId,
            subscriptionId: null,
            checkoutSessionId: input.checkoutSessionId,
            gateway: input.gateway,
            type: PaymentTransactionType.CHARGE,
            status: PaymentTransactionStatus.CAPTURED,
            amountMinor: input.amountMinor,
            currency: input.currency,
            providerAmountMinor: input.amountMinor,
            providerCurrency: input.currency,
            providerTransactionId: input.providerTransactionId,
            providerOrderId: input.providerOrderId,
            idempotencyKey: `compensation-charge:${input.checkoutSessionId}`,
            failureCode: input.failureCode,
            capturedAt: new Date(),
          },
        }));

      const idempotencyKey = `automatic:${input.checkoutSessionId}`;
      const existingRefund = await tx.refund.findUnique({
        where: {
          requestedByUserId_idempotencyKey: {
            requestedByUserId: AUTOMATIC_REFUND_ACTOR,
            idempotencyKey,
          },
        },
      });
      const refund =
        existingRefund ??
        (await tx.refund.create({
          data: {
            paymentTransactionId: charge.id,
            subscriptionId: charge.subscriptionId,
            invoiceId: null,
            userId: charge.userId,
            requestedByUserId: AUTOMATIC_REFUND_ACTOR,
            gateway: charge.gateway,
            status: RefundStatus.PENDING,
            amountMinor: charge.amountMinor,
            currency: charge.currency,
            providerAmountMinor: charge.providerAmountMinor ?? charge.amountMinor,
            providerCurrency: charge.providerCurrency ?? charge.currency,
            idempotencyKey,
            providerIdempotencyKey: `auto-refund:${input.checkoutSessionId}`,
            reason: input.reason,
            failureCode: input.failureCode,
            automatic: true,
            nextAttemptAt: new Date(),
          },
        }));
      return {
        refund,
        providerTransactionId: input.providerTransactionId,
        checkoutSessionId: input.checkoutSessionId,
      };
    });
  }

  async listRetryableAutomaticCompensations(
    now: Date,
    limit: number,
  ): Promise<PreparedAutomaticCompensation[]> {
    const rows = await this.prisma.refund.findMany({
      where: {
        automatic: true,
        status: RefundStatus.PENDING,
        providerRefundId: null,
        nextAttemptAt: { lte: now },
      },
      include: { paymentTransaction: true },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    });
    return rows.flatMap((row) => {
      const providerTransactionId = row.paymentTransaction.providerTransactionId;
      const checkoutSessionId = row.paymentTransaction.checkoutSessionId;
      if (providerTransactionId === null || checkoutSessionId === null) {
        return [];
      }
      return [{ refund: row, providerTransactionId, checkoutSessionId }];
    });
  }

  async markAutomaticAttemptFailed(id: string, failureCode: string): Promise<void> {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    const attempts = (refund?.attempts ?? 0) + 1;
    const delayMs = AUTOMATIC_REFUND_RETRY_BASE_MS * 2 ** Math.min(attempts - 1, 6);
    await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.PENDING,
        failureCode,
        attempts: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + delayMs),
      },
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

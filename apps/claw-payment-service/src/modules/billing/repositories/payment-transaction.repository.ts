import { Injectable, Logger } from '@nestjs/common';
import { PaymentTransactionStatus, PaymentTransactionType } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type PaymentTransaction, type Prisma } from '../../../generated/prisma';
import { type RecordTransactionInput } from '../types/billing-record.types';
import { type ReconciliationTransactionCandidate } from '../types/billing-reconciliation.types';

/**
 * Data access for payment transactions. Append-only: a correction is a new
 * compensating row, never an edit to an existing one.
 *
 * Every write takes an explicit `tx` so a transaction row is committed in the
 * same database transaction as the state change it pays for. A charge recorded
 * outside that transaction could survive a rolled-back activation, which is a
 * customer who was billed for a subscription they do not have.
 */
@Injectable()
export class PaymentTransactionRepository {
  private readonly logger = new Logger(PaymentTransactionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    tx: Prisma.TransactionClient,
    input: RecordTransactionInput,
  ): Promise<PaymentTransaction> {
    this.logger.debug(`record: type=${input.type} gateway=${input.gateway}`);
    return tx.paymentTransaction.create({
      data: {
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        checkoutSessionId: input.checkoutSessionId,
        gateway: input.gateway,
        type: input.type,
        status: input.status,
        amountMinor: input.amountMinor,
        currency: input.currency,
        providerAmountMinor: input.providerAmountMinor,
        providerCurrency: input.providerCurrency,
        providerTransactionId: input.providerTransactionId,
        providerOrderId: input.providerOrderId,
        idempotencyKey: input.idempotencyKey,
        priceSnapshotJson: input.priceSnapshot ?? undefined,
        fxSnapshotJson: input.fxSnapshot ?? undefined,
        capturedAt: input.capturedAt,
        refundedAt: input.refundedAt,
        reversesTransactionId: input.reversesTransactionId,
      },
    });
  }

  /**
   * The row for a provider transaction id, if we already recorded it.
   *
   * Checked before recording a reversal so a redelivered refund webhook finds
   * its own row and stops, rather than relying on the unique index to raise.
   */
  async findByProviderTransactionId(
    gateway: string,
    providerTransactionId: string,
  ): Promise<PaymentTransaction | null> {
    this.logger.debug(`findByProviderTransactionId: gateway=${gateway}`);
    return this.prisma.paymentTransaction.findUnique({
      where: { gateway_providerTransactionId: { gateway, providerTransactionId } },
    });
  }

  /** One transaction by id. Used to read a reversed charge's frozen snapshot. */
  async findById(id: string): Promise<PaymentTransaction | null> {
    this.logger.debug(`findById: ${id}`);
    return this.prisma.paymentTransaction.findUnique({ where: { id } });
  }

  /**
   * The most recent successful charge on a subscription.
   *
   * A refund or chargeback names a capture, not a subscription, so this is the
   * fallback used when the reversal payload cannot be tied to a specific charge —
   * it is the row a reversal most plausibly offsets.
   */
  async findLatestChargeForSubscription(
    subscriptionId: string,
  ): Promise<PaymentTransaction | null> {
    this.logger.debug(`findLatestChargeForSubscription: subscription=${subscriptionId}`);
    return this.prisma.paymentTransaction.findFirst({
      where: {
        subscriptionId,
        type: { in: [PaymentTransactionType.CHARGE, PaymentTransactionType.RENEWAL] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Every transaction for a user, newest first. Powers the billing history. */
  async listForUser(userId: string, limit: number): Promise<PaymentTransaction[]> {
    this.logger.debug(`listForUser: user=${userId}`);
    return this.prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Charges with no entitlement event behind them. A reconciliation input. */
  async countByType(type: PaymentTransactionType): Promise<number> {
    return this.prisma.paymentTransaction.count({ where: { type } });
  }

  async listNonTerminalForReconciliation(
    limit: number,
  ): Promise<ReconciliationTransactionCandidate[]> {
    return this.prisma.paymentTransaction.findMany({
      where: {
        status: {
          in: [
            PaymentTransactionStatus.PENDING,
            PaymentTransactionStatus.AUTHORIZED,
            PaymentTransactionStatus.UNRESOLVED,
          ],
        },
      },
      include: { checkoutSession: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async countNonTerminalForReconciliation(): Promise<number> {
    return this.prisma.paymentTransaction.count({
      where: {
        status: {
          in: [
            PaymentTransactionStatus.PENDING,
            PaymentTransactionStatus.AUTHORIZED,
            PaymentTransactionStatus.UNRESOLVED,
          ],
        },
      },
    });
  }
}

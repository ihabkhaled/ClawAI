import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BillingErrorCode,
  type BillingPaymentRefundedPayload,
  EntitlementGrantType,
  EventPattern,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { BillingRecordService } from '../../billing/services/billing-record.service';
import { CreditTopupLifecycleService } from '../../billing/services/credit-topup-lifecycle.service';
import {
  proportionalCreditMicroUsd,
  readCreditTopupSnapshot,
} from '../../billing/utilities/credit-topup-snapshot.utility';
import {
  BILLING_EVENT_SCHEMA_VERSION,
  PAYMENT_PRODUCER,
} from '../../billing/constants/billing.constants';
import { OutboxRepository } from '../../outbox/repositories/outbox.repository';
import { type Prisma, RefundStatus } from '../../../generated/prisma';
import { RefundRepository } from '../repositories/refund.repository';
import { type RefundCompletionContext, type RefundRecord } from '../types/refund.types';

@Injectable()
export class RefundCompletionService {
  private readonly logger = new Logger(RefundCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refunds: RefundRepository,
    private readonly records: BillingRecordService,
    private readonly outbox: OutboxRepository,
    private readonly creditTopups: CreditTopupLifecycleService,
  ) {}

  async complete(
    refundId: string,
    providerRefundId: string,
    correlationId: string,
  ): Promise<RefundRecord> {
    return this.prisma.$transaction(async (tx) =>
      this.completeTransaction(tx, refundId, providerRefundId, correlationId),
    );
  }

  private async completeTransaction(
    tx: Prisma.TransactionClient,
    refundId: string,
    providerRefundId: string,
    correlationId: string,
  ): Promise<RefundRecord> {
    const context = await this.refunds.findForCompletion(tx, refundId);
    if (context === null) {
      throw new BillingException(BillingErrorCode.REFUND_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (context.refund.status === RefundStatus.SUCCEEDED) {
      return context.refund;
    }

    const reversalId = await this.recordRefundTransaction(tx, context, providerRefundId);
    const completedAt = new Date();
    const completed = await this.refunds.markSucceeded(tx, refundId, providerRefundId, completedAt);
    if (reversalId === null) {
      this.logger.warn(`complete: reversal already recorded refund=${refundId}`);
      return completed;
    }

    // A credit top-up has no subscription, so `applyEntitlementPolicy` is a
    // no-op and `enqueueEvent` returns early — a credit reversal REVOKES
    // NOTHING, exactly as ADR-064 intends: it reverses money that bought a
    // balance, not access.
    if (
      await this.enqueueCreditReversal(tx, context, {
        reversalId,
        providerRefundId,
        correlationId,
      })
    ) {
      return completed;
    }

    const isFullRefund = await this.applyEntitlementPolicy(tx, context);
    await this.enqueueEvent(tx, context, reversalId, correlationId, completedAt, isFullRefund);
    return completed;
  }

  /**
   * Enqueues `billing.credit.topup_reversed` when the reversed charge bought
   * credit. Returns true when it handled the refund.
   *
   * The credit figure comes from the snapshot frozen onto the original charge,
   * scaled to the portion of the money actually returned — never re-read from
   * the package, which may since have been repriced or withdrawn.
   *
   * A charge whose snapshot cannot be read is REFUSED rather than reversed with
   * a guessed figure: the money has already gone back, and an operator ticket
   * is a far better outcome than a wallet quietly wrong by an unknown amount.
   */
  private async enqueueCreditReversal(
    tx: Prisma.TransactionClient,
    context: RefundCompletionContext,
    reversal: { reversalId: string; providerRefundId: string; correlationId: string },
  ): Promise<boolean> {
    if (context.charge.type !== PaymentTransactionType.CREDIT_TOPUP) {
      return false;
    }
    const snapshot = readCreditTopupSnapshot(context.charge.priceSnapshotJson);
    if (snapshot === null) {
      this.logger.error(
        `enqueueCreditReversal: unreadable top-up snapshot charge=${context.charge.id}`,
      );
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH, HttpStatus.CONFLICT);
    }
    await this.creditTopups.enqueueReversalInTransaction(
      tx,
      {
        userId: context.refund.userId,
        gateway: context.refund.gateway,
        type: PaymentTransactionType.REFUND,
        amountMinor: context.refund.amountMinor,
        currency: context.refund.currency,
        providerAmountMinor: context.refund.providerAmountMinor,
        providerCurrency: context.refund.providerCurrency,
        providerTransactionId: reversal.providerRefundId,
        idempotencyKey: `credit-reversal:${context.refund.id}`,
        sourcePaymentTransactionId: context.charge.id,
        packageId: snapshot.packageId,
        packageVersionId: snapshot.packageVersionId,
        creditMicroUsd: proportionalCreditMicroUsd(
          BigInt(snapshot.creditMicroUsd),
          context.refund.amountMinor,
          context.charge.amountMinor,
        ),
        invoiceId: context.refund.invoiceId,
        correlationId: reversal.correlationId,
      },
      reversal.reversalId,
    );
    this.logger.warn(`enqueueCreditReversal: refund=${context.refund.id} credit reversal enqueued`);
    return true;
  }

  private async applyEntitlementPolicy(
    tx: Prisma.TransactionClient,
    context: RefundCompletionContext,
  ): Promise<boolean> {
    if (context.subscription === null) {
      return false;
    }
    const total = await this.refunds.sumSucceededAmount(tx, context.charge.id);
    if (total !== context.charge.amountMinor) {
      return false;
    }
    await tx.subscription.update({
      where: { id: context.subscription.id },
      data: {
        status: SubscriptionStatus.REFUNDED,
        uniqueActiveKey: null,
        version: { increment: 1 },
      },
    });
    return true;
  }

  private async recordRefundTransaction(
    tx: Prisma.TransactionClient,
    context: RefundCompletionContext,
    providerRefundId: string,
  ): Promise<string | null> {
    return this.records.recordReversal(tx, {
      userId: context.refund.userId,
      subscriptionId: context.refund.subscriptionId,
      gateway: context.refund.gateway,
      type: PaymentTransactionType.REFUND,
      amountMinor: context.refund.amountMinor,
      currency: context.refund.currency,
      providerAmountMinor: context.refund.providerAmountMinor,
      providerCurrency: context.refund.providerCurrency,
      providerTransactionId: providerRefundId,
      idempotencyKey: `refund:${context.refund.id}`,
      reversesTransactionId: context.charge.id,
      invoiceId: context.refund.invoiceId,
    });
  }

  private async enqueueEvent(
    tx: Prisma.TransactionClient,
    context: NonNullable<Awaited<ReturnType<RefundRepository['findForCompletion']>>>,
    reversalId: string,
    correlationId: string,
    completedAt: Date,
    isFullRefund: boolean,
  ): Promise<void> {
    if (context.subscription === null) {
      return;
    }
    const eventId = randomUUID();
    const effectiveAt = completedAt.toISOString();
    const payload: BillingPaymentRefundedPayload = {
      eventId,
      schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
      producer: PAYMENT_PRODUCER,
      causationId: reversalId,
      correlationId,
      occurredAt: effectiveAt,
      userId: context.refund.userId,
      subscriptionId: context.subscription.id,
      planId: context.subscription.planId,
      planSlug: context.subscription.planSlug,
      planPriceVersionId: context.subscription.planPriceVersionId,
      grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
      effectiveAt,
      entitlementValidUntil: isFullRefund
        ? effectiveAt
        : context.subscription.entitlementValidUntil.toISOString(),
      paymentTransactionId: context.charge.id,
      refundedAmountMinor: context.refund.amountMinor,
      currency: context.refund.currency,
      isFullRefund,
    };
    await this.outbox.enqueue(tx, {
      pattern: EventPattern.BILLING_PAYMENT_REFUNDED,
      eventId,
      aggregateType: 'Refund',
      aggregateId: context.refund.id,
      payloadJson: payload,
    });
  }
}

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

    const isFullRefund = await this.applyEntitlementPolicy(tx, context);
    await this.enqueueEvent(tx, context, reversalId, correlationId, completedAt, isFullRefund);
    return completed;
  }

  private async applyEntitlementPolicy(
    tx: Prisma.TransactionClient,
    context: RefundCompletionContext,
  ): Promise<boolean> {
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
      providerAmountMinor: context.refund.amountMinor,
      providerCurrency: context.refund.currency,
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

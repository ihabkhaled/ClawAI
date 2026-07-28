import { HttpStatus, Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { RefundStatus } from '../../../generated/prisma';
import { type ReversalRequest } from '../../webhooks/types/reversal.types';
import { RefundRepository } from '../repositories/refund.repository';
import { RefundCompletionService } from './refund-completion.service';

@Injectable()
export class RefundWebhookService {
  constructor(
    private readonly refunds: RefundRepository,
    private readonly completion: RefundCompletionService,
  ) {}

  async apply(request: ReversalRequest): Promise<boolean> {
    const providerRefundId = request.providerTransactionId ?? request.correlationId;
    const existing = await this.refunds.findByProviderRefundId(request.gateway, providerRefundId);
    if (existing?.status === RefundStatus.SUCCEEDED) {
      return false;
    }
    if (existing) {
      await this.completion.complete(existing.id, providerRefundId, request.correlationId);
      return true;
    }

    const charge = await this.refunds.findCapturedCharge(request.originalTransactionId);
    if (charge === null) {
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH, HttpStatus.CONFLICT);
    }
    if (
      charge.subscriptionId !== request.subscriptionId ||
      charge.userId !== request.userId ||
      charge.gateway !== request.gateway ||
      charge.currency !== request.currency
    ) {
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH, HttpStatus.CONFLICT);
    }
    const reservation = await this.refunds.reserve({
      requestedByUserId: `provider:${request.gateway}`,
      paymentTransactionId: charge.id,
      amountMinor: request.amountMinor,
      idempotencyKey: `webhook:${providerRefundId}`,
      providerIdempotencyKey: providerRefundId,
      reason: 'PROVIDER_CONFIRMED_REFUND',
      charge,
      providerAmountMinor: request.providerAmountMinor ?? request.amountMinor,
      providerCurrency: request.providerCurrency ?? request.currency,
    });
    await this.completion.complete(reservation.id, providerRefundId, request.correlationId);
    return true;
  }
}

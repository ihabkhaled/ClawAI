import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BillingErrorCode, BillingGateway, type RefundView } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { RefundRepository } from '../repositories/refund.repository';
import { RefundCompletionService } from '../services/refund-completion.service';
import { type RefundRecord, type RequestRefundInput } from '../types/refund.types';
import { calculateRemainingRefundableMinor } from '../utilities/refund-balance.utility';
import { toRefundView } from '../utilities/refund-view.utility';

@Injectable()
export class RefundManager {
  private readonly logger = new Logger(RefundManager.name);

  constructor(
    private readonly refunds: RefundRepository,
    private readonly paypal: PaypalAdapter,
    private readonly paymob: PaymobAdapter,
    private readonly completion: RefundCompletionService,
  ) {}

  async request(input: RequestRefundInput): Promise<RefundView> {
    const existing = await this.refunds.findByIdempotencyKey(
      input.requestedByUserId,
      input.idempotencyKey,
    );
    if (existing !== null) {
      RefundManager.assertIdempotentReplay(existing, input);
      return toRefundView(existing);
    }

    RefundManager.assertRequestedAmount(input.amountMinor);
    const charge = await this.refunds.findCapturedCharge(input.paymentTransactionId);
    if (charge === null) {
      throw new BillingException(
        BillingErrorCode.REFUND_TRANSACTION_NOT_REFUNDABLE,
        HttpStatus.CONFLICT,
      );
    }
    const reserved = await this.refunds.listReservedAmounts(charge.id);
    const remaining = calculateRemainingRefundableMinor(charge.amountMinor, reserved);
    if (input.amountMinor > remaining) {
      throw new BillingException(
        BillingErrorCode.REFUND_AMOUNT_EXCEEDS_REMAINING,
        HttpStatus.CONFLICT,
      );
    }

    const reservation = await this.refunds.reserve({
      ...input,
      charge,
      providerIdempotencyKey: `refund:${randomUUID()}`,
    });
    const providerResult = await this.callProvider(reservation, charge.providerTransactionId);
    if (!providerResult.completed) {
      return toRefundView(
        await this.refunds.markProviderAccepted(reservation.id, providerResult.refundId),
      );
    }
    return toRefundView(
      await this.completion.complete(reservation.id, providerResult.refundId, input.idempotencyKey),
    );
  }

  private async callProvider(
    refund: RefundRecord,
    providerTransactionId: string,
  ): Promise<{ refundId: string; completed: boolean }> {
    try {
      if (refund.gateway === BillingGateway.PAYPAL) {
        const result = await this.paypal.refundCapture(
          providerTransactionId,
          refund.amountMinor,
          refund.currency,
          refund.providerIdempotencyKey,
        );
        return { refundId: result.refundId, completed: result.status === 'COMPLETED' };
      }
      if (refund.gateway === BillingGateway.PAYMOB) {
        const result = await this.paymob.refund(
          providerTransactionId,
          refund.amountMinor,
          refund.providerIdempotencyKey,
        );
        return { refundId: result.refundId, completed: true };
      }
      throw new BillingException(BillingErrorCode.GATEWAY_NOT_CONFIGURED);
    } catch {
      await this.refunds.markFailed(refund.id, BillingErrorCode.GATEWAY_UNAVAILABLE);
      this.logger.error(`callProvider: failed refund=${refund.id}`);
      throw new BillingException(BillingErrorCode.GATEWAY_UNAVAILABLE, HttpStatus.BAD_GATEWAY);
    }
  }

  private static assertRequestedAmount(amountMinor: number): void {
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new BillingException(BillingErrorCode.REFUND_AMOUNT_INVALID);
    }
  }

  private static assertIdempotentReplay(existing: RefundRecord, input: RequestRefundInput): void {
    if (
      existing.paymentTransactionId !== input.paymentTransactionId ||
      existing.amountMinor !== input.amountMinor ||
      existing.reason !== input.reason
    ) {
      throw new BillingException(BillingErrorCode.IDEMPOTENCY_KEY_REUSED, HttpStatus.CONFLICT);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { RefundStatus } from '../../../generated/prisma';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { RefundRepository } from '../repositories/refund.repository';
import {
  type AutomaticCompensationInput,
  type PreparedAutomaticCompensation,
} from '../types/refund.types';
import { RefundCompletionService } from './refund-completion.service';

@Injectable()
export class PaymentCompensationService {
  private readonly logger = new Logger(PaymentCompensationService.name);

  constructor(
    private readonly refunds: RefundRepository,
    private readonly paypal: PaypalAdapter,
    private readonly paymob: PaymobAdapter,
    private readonly completion: RefundCompletionService,
  ) {}

  async compensate(input: AutomaticCompensationInput): Promise<void> {
    const prepared = await this.refunds.prepareAutomaticCompensation(input);
    await this.execute(prepared);
  }

  async retry(prepared: PreparedAutomaticCompensation): Promise<void> {
    await this.execute(prepared);
  }

  private async execute(prepared: PreparedAutomaticCompensation): Promise<void> {
    const refund = prepared.refund;
    if (refund.status === RefundStatus.SUCCEEDED || refund.providerRefundId !== null) {
      return;
    }

    try {
      const provider = await this.callProvider(refund, prepared.providerTransactionId);
      await this.refunds.markProviderAccepted(refund.id, provider.refundId);
      if (provider.completed) {
        await this.completion.complete(
          refund.id,
          provider.refundId,
          `compensation:${prepared.checkoutSessionId}`,
        );
      }
    } catch {
      await this.refunds.markAutomaticAttemptFailed(
        refund.id,
        BillingErrorCode.GATEWAY_UNAVAILABLE,
      );
      this.logger.error(`compensate: provider refund deferred refund=${refund.id}`);
      throw new BillingException(BillingErrorCode.GATEWAY_UNAVAILABLE);
    }
  }

  private async callProvider(
    refund: {
      gateway: string;
      providerAmountMinor: number;
      providerCurrency: string;
      providerIdempotencyKey: string;
    },
    providerTransactionId: string,
  ): Promise<{ refundId: string; completed: boolean }> {
    if (refund.gateway === BillingGateway.PAYPAL) {
      const result = await this.paypal.refundCapture(
        providerTransactionId,
        refund.providerAmountMinor,
        refund.providerCurrency,
        refund.providerIdempotencyKey,
      );
      return { refundId: result.refundId, completed: result.status === 'COMPLETED' };
    }
    if (refund.gateway === BillingGateway.PAYMOB) {
      const result = await this.paymob.refund(
        providerTransactionId,
        refund.providerAmountMinor,
        refund.providerIdempotencyKey,
      );
      return { refundId: result.refundId, completed: true };
    }
    throw new BillingException(BillingErrorCode.GATEWAY_NOT_CONFIGURED);
  }
}

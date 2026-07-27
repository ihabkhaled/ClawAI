import { Injectable } from '@nestjs/common';
import { type RefundableTransactionView } from '@claw/shared-types';

import { RefundRepository } from '../repositories/refund.repository';
import { calculateRemainingRefundableMinor } from '../utilities/refund-balance.utility';

@Injectable()
export class RefundQueryService {
  constructor(private readonly refunds: RefundRepository) {}

  async listRefundableTransactions(): Promise<RefundableTransactionView[]> {
    const charges = await this.refunds.listRefundableCharges();
    return charges.flatMap((charge) => {
      const remainingAmountMinor = calculateRemainingRefundableMinor(
        charge.amountMinor,
        charge.reservedAmounts,
      );
      if (remainingAmountMinor === 0) {
        return [];
      }
      return [
        {
          id: charge.id,
          userId: charge.userId,
          subscriptionId: charge.subscriptionId,
          gateway: charge.gateway,
          capturedAmountMinor: charge.amountMinor,
          remainingAmountMinor,
          currency: charge.currency,
          capturedAt: charge.capturedAt.toISOString(),
        },
      ];
    });
  }
}

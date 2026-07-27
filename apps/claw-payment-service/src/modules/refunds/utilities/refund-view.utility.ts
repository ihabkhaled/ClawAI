import { RefundStatus, type RefundView } from '@claw/shared-types';

import { type RefundRecord } from '../types/refund.types';

export function toRefundView(refund: RefundRecord): RefundView {
  return {
    id: refund.id,
    paymentTransactionId: refund.paymentTransactionId,
    status: RefundStatus[refund.status],
    amountMinor: refund.amountMinor,
    currency: refund.currency,
    reason: refund.reason,
    createdAt: refund.createdAt.toISOString(),
    completedAt: refund.completedAt?.toISOString() ?? null,
  };
}

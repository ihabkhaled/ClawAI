import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(private readonly methods: PaymentMethodRepository) {}

  /**
   * Removes a vaulted payment method.
   *
   * Soft delete, scoped by userId at the query. The row survives because past
   * charges reference it and an invoice that cannot say which card paid it is
   * not reproducible — but the status flip makes the stored token unusable.
   *
   * A method belonging to someone else reports NOT FOUND rather than FORBIDDEN,
   * so this cannot be used to discover which ids exist.
   */
  async remove(userId: string, methodId: string): Promise<void> {
    this.logger.debug(`remove: user=${userId} method=${methodId}`);
    const removed = await this.methods.softDelete(userId, methodId);
    if (removed === 0) {
      this.logger.warn(`remove: no owned method ${methodId} for user ${userId}`);
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_NOT_FOUND);
    }
    this.logger.log(`remove: method=${methodId} removed for user=${userId}`);
  }
}

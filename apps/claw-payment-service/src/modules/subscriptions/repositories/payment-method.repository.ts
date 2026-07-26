import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethodStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type PaymentMethod } from '../../../generated/prisma';

@Injectable()
export class PaymentMethodRepository {
  private readonly logger = new Logger(PaymentMethodRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async listActiveForUser(userId: string): Promise<PaymentMethod[]> {
    this.logger.debug(`listActiveForUser: user=${userId}`);
    return this.prisma.paymentMethod.findMany({
      where: { userId, deletedAt: null, status: PaymentMethodStatus.ACTIVE },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOwned(userId: string, id: string): Promise<PaymentMethod | null> {
    this.logger.debug(`findOwned: user=${userId} method=${id}`);
    return this.prisma.paymentMethod.findFirst({ where: { id, userId, deletedAt: null } });
  }

  /**
   * Soft-deletes a vaulted method.
   *
   * The row is retained rather than removed because a past charge references
   * it, and an invoice that cannot say which card paid it is not reproducible.
   * The ciphertext stays put; it is unusable once the status flips.
   */
  async softDelete(userId: string, id: string): Promise<number> {
    this.logger.debug(`softDelete: user=${userId} method=${id}`);
    const result = await this.prisma.paymentMethod.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date(), status: PaymentMethodStatus.DELETED, isDefault: false },
    });
    return result.count;
  }
}

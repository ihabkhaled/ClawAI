import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { PaymentTransaction, Subscription } from '../../../generated/prisma';

@Injectable()
export class InternalPaymentsRepository {
  private readonly logger = new Logger(InternalPaymentsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findPaymentById(id: string): Promise<PaymentTransaction | null> {
    this.logger.debug(`findPaymentById: ${id}`);
    return this.prisma.paymentTransaction.findUnique({ where: { id } });
  }

  async findSubscriptionById(id: string): Promise<Subscription | null> {
    this.logger.debug(`findSubscriptionById: ${id}`);
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  async findAuthoritativeSubscriptionForUser(userId: string): Promise<Subscription | null> {
    this.logger.debug(`findAuthoritativeSubscriptionForUser: user=${userId}`);
    const active = await this.prisma.subscription.findUnique({
      where: { uniqueActiveKey: userId },
    });
    if (active !== null) {
      return active;
    }
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

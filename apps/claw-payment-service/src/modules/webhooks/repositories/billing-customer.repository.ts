import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type BillingCustomer } from '../../../generated/prisma';

@Injectable()
export class BillingCustomerRepository {
  private readonly logger = new Logger(BillingCustomerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndGateway(userId: string, gateway: string): Promise<BillingCustomer | null> {
    this.logger.debug(`findByUserAndGateway: user=${userId} gateway=${gateway}`);
    return this.prisma.billingCustomer.findUnique({
      where: { userId_gateway: { userId, gateway } },
    });
  }

  /**
   * Gets or creates the customer row for a (user, gateway) pair.
   *
   * Written as an upsert on the unique pair rather than find-then-create: two
   * webhooks for the same user arriving concurrently would otherwise race, and
   * one would fail on the unique index mid-activation.
   */
  async ensureForUser(userId: string, gateway: string): Promise<BillingCustomer> {
    this.logger.debug(`ensureForUser: user=${userId} gateway=${gateway}`);
    return this.prisma.billingCustomer.upsert({
      where: { userId_gateway: { userId, gateway } },
      update: {},
      create: { userId, gateway },
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { INVOICE_LIST_LIMIT } from '../constants/subscriptions.constants';
import { type Invoice } from '../../../generated/prisma';

@Injectable()
export class InvoiceRepository {
  private readonly logger = new Logger(InvoiceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // Always scoped by userId, never by invoice id alone. Scoping at the query
  // rather than filtering afterwards means a missed ownership check cannot
  // return another customer's billing history.
  async listForUser(userId: string, limit: number = INVOICE_LIST_LIMIT): Promise<Invoice[]> {
    this.logger.debug(`listForUser: user=${userId}`);
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      take: limit,
    });
  }

  async findOwned(userId: string, invoiceId: string): Promise<Invoice | null> {
    this.logger.debug(`findOwned: user=${userId} invoice=${invoiceId}`);
    return this.prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
  }
}

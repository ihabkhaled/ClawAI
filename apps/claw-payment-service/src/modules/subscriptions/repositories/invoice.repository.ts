import { Injectable, Logger } from '@nestjs/common';

import { InvoiceStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { INVOICE_LIST_LIMIT, PAID_INVOICE_SCAN_LIMIT } from '../constants/subscriptions.constants';
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

  // PAID invoices only, for figures that must reflect money actually
  // collected. Filtering at the query rather than afterwards keeps the bound
  // meaningful: taking 600 rows and then dropping the unpaid ones would sum a
  // truncated set. A fully refunded invoice moves to REFUNDED and correctly
  // drops out; an OPEN one was never paid.
  async listPaidForUser(
    userId: string,
    limit: number = PAID_INVOICE_SCAN_LIMIT,
  ): Promise<Invoice[]> {
    this.logger.debug(`listPaidForUser: user=${userId}`);
    return this.prisma.invoice.findMany({
      where: { userId, status: InvoiceStatus.PAID },
      orderBy: { issuedAt: 'desc' },
      take: limit,
    });
  }

  async findOwned(userId: string, invoiceId: string): Promise<Invoice | null> {
    this.logger.debug(`findOwned: user=${userId} invoice=${invoiceId}`);
    return this.prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
  }
}

import { Injectable, Logger } from '@nestjs/common';

import { InvoiceDeliveryStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type InvoiceDeliveryCandidate,
  type InvoiceWithLines,
} from '../types/invoice-document.types';

@Injectable()
export class InvoiceDocumentRepository {
  private readonly logger = new Logger(InvoiceDocumentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOwnedWithLines(userId: string, invoiceId: string): Promise<InvoiceWithLines | null> {
    this.logger.debug(`findOwnedWithLines: user=${userId} invoice=${invoiceId}`);
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findByIdWithLines(invoiceId: string): Promise<InvoiceWithLines | null> {
    this.logger.debug(`findByIdWithLines: invoice=${invoiceId}`);
    return this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async listDue(limit: number, now: Date): Promise<InvoiceDeliveryCandidate[]> {
    return this.prisma.invoiceDelivery.findMany({
      where: { status: InvoiceDeliveryStatus.PENDING, availableAt: { lte: now } },
      include: { invoice: { select: { number: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markDelivered(id: string, deliveredAt: Date): Promise<void> {
    await this.prisma.invoiceDelivery.update({
      where: { id },
      data: {
        status: InvoiceDeliveryStatus.DELIVERED,
        deliveredAt,
        lastErrorCode: null,
      },
    });
  }

  async markFailed(
    id: string,
    attempts: number,
    maxAttempts: number,
    retryAt: Date,
    errorCode: string,
  ): Promise<void> {
    await this.prisma.invoiceDelivery.update({
      where: { id },
      data: {
        status:
          attempts >= maxAttempts ? InvoiceDeliveryStatus.FAILED : InvoiceDeliveryStatus.PENDING,
        attempts,
        availableAt: retryAt,
        lastErrorCode: errorCode,
      },
    });
  }
}

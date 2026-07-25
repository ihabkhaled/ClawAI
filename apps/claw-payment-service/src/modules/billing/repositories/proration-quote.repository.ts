import { Injectable } from '@nestjs/common';
import { type ProrationQuoteStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type Prisma, type ProrationQuote } from '../../../generated/prisma';

@Injectable()
export class ProrationQuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProrationQuoteUncheckedCreateInput): Promise<ProrationQuote> {
    return this.prisma.prorationQuote.create({ data });
  }

  async findById(id: string): Promise<ProrationQuote | null> {
    return this.prisma.prorationQuote.findUnique({ where: { id } });
  }

  // Conditional update on the CURRENT status, so two concurrent confirms cannot
  // both consume the same quote — the second one updates zero rows.
  async consumeIfActive(id: string, active: ProrationQuoteStatus): Promise<number> {
    const result = await this.prisma.prorationQuote.updateMany({
      where: { id, status: active },
      data: { status: 'CONSUMED', consumedAt: new Date() },
    });
    return result.count;
  }

  async markStatus(id: string, status: ProrationQuoteStatus): Promise<void> {
    await this.prisma.prorationQuote.update({ where: { id }, data: { status } });
  }
}

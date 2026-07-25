import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type FxQuote } from '../../../generated/prisma';

@Injectable()
export class FxQuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Newest still-valid quote for the pair, or null. Expired quotes are left in
  // place rather than deleted: an invoice must always be explainable by the
  // exact rate that produced it.
  async findFresh(
    baseCurrency: string,
    quoteCurrency: string,
    nowMs: number,
  ): Promise<FxQuote | null> {
    return this.prisma.fxQuote.findFirst({
      where: { baseCurrency, quoteCurrency, expiresAt: { gt: new Date(nowMs) } },
      orderBy: { fetchedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<FxQuote | null> {
    return this.prisma.fxQuote.findUnique({ where: { id } });
  }

  async create(data: {
    baseCurrency: string;
    quoteCurrency: string;
    sourceRateScaled: bigint;
    safetyMarginBps: number;
    finalRateScaled: bigint;
    source: string;
    fetchedAt: Date;
    expiresAt: Date;
  }): Promise<FxQuote> {
    return this.prisma.fxQuote.create({ data });
  }
}

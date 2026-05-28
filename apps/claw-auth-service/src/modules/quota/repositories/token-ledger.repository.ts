import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type TokenUsageLedger } from '../../../generated/prisma';

@Injectable()
export class TokenLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForDay(userId: string, date: string): Promise<TokenUsageLedger | null> {
    return this.prisma.tokenUsageLedger.findUnique({ where: { userId_date: { userId, date } } });
  }

  // Upsert the per-day ledger row, incrementing the running totals.
  async addUsage(params: {
    userId: string;
    planId: string | null;
    date: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }): Promise<void> {
    await this.prisma.tokenUsageLedger.upsert({
      where: { userId_date: { userId: params.userId, date: params.date } },
      update: {
        inputTokens: { increment: params.inputTokens },
        outputTokens: { increment: params.outputTokens },
        totalTokens: { increment: params.totalTokens },
        requestCount: { increment: 1 },
        planId: params.planId,
      },
      create: {
        userId: params.userId,
        planId: params.planId,
        date: params.date,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.totalTokens,
        requestCount: 1,
      },
    });
  }
}

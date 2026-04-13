import { Injectable } from '@nestjs/common';
import { type ReplayCase } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { CreateReplayCaseData } from '../types/replay-run.types';

@Injectable()
export class ReplayCasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(cases: CreateReplayCaseData[]): Promise<void> {
    await this.prisma.replayCase.createMany({ data: cases });
  }

  async findByRunId(runId: string): Promise<ReplayCase[]> {
    return this.prisma.replayCase.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findSuspiciousByRunId(runId: string): Promise<ReplayCase[]> {
    return this.prisma.replayCase.findMany({
      where: { runId, isSuspicious: true },
      orderBy: { improvementScore: 'asc' },
    });
  }

  async findById(id: string): Promise<ReplayCase | null> {
    return this.prisma.replayCase.findUnique({ where: { id } });
  }

  async review(
    id: string,
    isConfirmedRegression: boolean,
    reviewNotes: string | undefined,
  ): Promise<ReplayCase> {
    return this.prisma.replayCase.update({
      where: { id },
      data: {
        isConfirmedRegression,
        reviewNotes: reviewNotes ?? null,
        reviewedAt: new Date(),
      },
    });
  }
}

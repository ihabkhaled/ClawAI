import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  CompleteAutoSuggestRunInput,
  CreateAutoSuggestRunInput,
} from '../types/auto-suggest.types';
import type { AutoSuggestRun } from '../../../generated/prisma';

@Injectable()
export class AutoSuggestRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAutoSuggestRunInput): Promise<AutoSuggestRun> {
    return this.prisma.autoSuggestRun.create({
      data: { jobType: input.jobType, status: 'RUNNING' },
    });
  }

  async complete(input: CompleteAutoSuggestRunInput): Promise<AutoSuggestRun> {
    return this.prisma.autoSuggestRun.update({
      where: { id: input.id },
      data: {
        status: input.status,
        candidateCount: input.candidateCount,
        suggestionsCreated: input.suggestionsCreated,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async listRecent(limit: number): Promise<AutoSuggestRun[]> {
    return this.prisma.autoSuggestRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}

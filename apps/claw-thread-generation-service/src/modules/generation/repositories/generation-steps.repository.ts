import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  STEP_APPEND_MAX_RETRIES,
  STEP_LIST_MAX,
  STEP_ROW_SELECT,
} from '../constants/step-recorder.constants';
import type { StepAppendData, StepRow } from '../types/step-recorder.types';

@Injectable()
export class GenerationStepsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends with the next per-job sequence number. Parallel authors can race for the same
   * number, so a unique violation retries with a fresh read.
   */
  async append(jobId: string, data: StepAppendData): Promise<boolean> {
    for (let attempt = 0; attempt < STEP_APPEND_MAX_RETRIES; attempt += 1) {
      const last = await this.prisma.threadGenerationStep.findFirst({
        where: { jobId },
        orderBy: { seq: 'desc' },
        select: { seq: true },
      });
      try {
        await this.prisma.threadGenerationStep.create({
          data: { jobId, seq: (last?.seq ?? 0) + 1, ...data },
        });
        return true;
      } catch (error: unknown) {
        const raced =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        // Only a sequence race is worth another read; any other failure is reported as not stored.
        if (!raced) return false;
      }
    }
    return false;
  }

  /** Oldest step plus the newest ones, so a very long job still shows how it began and ended. */
  async list(jobId: string): Promise<StepRow[]> {
    const newest = await this.prisma.threadGenerationStep.findMany({
      where: { jobId },
      orderBy: { seq: 'desc' },
      take: STEP_LIST_MAX,
      select: STEP_ROW_SELECT,
    });
    newest.reverse();
    if (newest.length < STEP_LIST_MAX) return newest;
    const first = await this.prisma.threadGenerationStep.findFirst({
      where: { jobId },
      orderBy: { seq: 'asc' },
      select: STEP_ROW_SELECT,
    });
    const oldestKept = newest[0];
    return first && oldestKept && first.seq !== oldestKept.seq
      ? [first, ...newest.slice(1)]
      : newest;
  }
}

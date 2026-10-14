import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  STEP_APPEND_MAX_RETRIES,
  STEP_LIST_MAX,
  STEP_ROW_SELECT,
} from '../constants/step-recorder.constants';
import type { CandidateHealth } from '../types/healing.types';
import type { StepAppendData, StepRow } from '../types/step-recorder.types';
import { candidateKey } from '../utilities/healing-candidates.utility';
import { classifyFailure } from '../utilities/classify-failure.utility';
import { MODEL_SPECIFIC_CLASSES } from '../constants/healing.constants';

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

  /** Model calls that ended well or badly since `since`, counted per provider/model (ADR-181). */
  async recentModelHealth(since: Date): Promise<Map<string, CandidateHealth>> {
    const rows = await this.prisma.threadGenerationStep.groupBy({
      by: ['provider', 'model', 'outcome'],
      where: {
        at: { gte: since },
        roleKind: { not: 'SYSTEM' },
        outcome: { in: ['SUCCEEDED', 'FAILED'] },
        provider: { not: null },
        model: { not: null },
      },
      _count: { _all: true },
    });
    const health = new Map<string, CandidateHealth>();
    for (const row of rows) {
      if (row.provider === null || row.model === null) continue;
      const key = candidateKey({ provider: row.provider, model: row.model });
      const entry = health.get(key) ?? { ok: 0, failed: 0 };
      if (row.outcome === 'SUCCEEDED') entry.ok += row._count._all;
      else entry.failed += row._count._all;
      health.set(key, entry);
    }
    return health;
  }

  /**
   * `provider/model` keys that failed this role for the model's own reasons (a refused reply, a
   * rejected request, a window overflow, no price) and never succeeded for it afterwards.
   */
  async modelSpecificFailures(jobId: string, roleId: string): Promise<Set<string>> {
    const rows = await this.prisma.threadGenerationStep.findMany({
      where: {
        jobId,
        roleId,
        outcome: { in: ['SUCCEEDED', 'FAILED'] },
        provider: { not: null },
        model: { not: null },
      },
      orderBy: { seq: 'asc' },
      select: { provider: true, model: true, outcome: true, code: true, httpStatus: true },
    });
    const failed = new Set<string>();
    for (const row of rows) {
      if (row.provider === null || row.model === null) continue;
      const key = candidateKey({ provider: row.provider, model: row.model });
      if (row.outcome === 'SUCCEEDED') {
        failed.delete(key);
      } else if (
        MODEL_SPECIFIC_CLASSES.has(
          classifyFailure({ code: row.code ?? '', httpStatus: row.httpStatus }).failureClass,
        )
      ) {
        failed.add(key);
      }
    }
    return failed;
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

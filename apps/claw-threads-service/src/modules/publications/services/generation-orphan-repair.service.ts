import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { RepairOrphanGenerationsDto } from '../dto/repair-orphan-generations.dto';
import { ACTIVE_GENERATION_JOB_STATUSES } from '../constants/publication-generation-owner.constants';
import { PublicationsRepository } from '../repositories/publications.repository';
import type { OrphanRepairOutcome, OrphanRepairResult } from '../types/orphan-repair.types';
import { GenerationStartGate } from './generation-start-gate.service';
import { ThreadsGenerationClient } from './threads-generation.client';

/**
 * Stops generation jobs that no publication points at. Before ADR-176 a start whose second step
 * failed left a QUEUED job with an active budget and no owner able to see or cancel it. This is
 * the break-glass repair for those: an operator names the job and its owner; a job that any
 * publication or edit review here references, or that is being attached right now, is never
 * touched, and one that is not queued or running is left as it is. Calling it again changes
 * nothing. Cancelling a queued job makes the generation service release its budget.
 */
@Injectable()
export class GenerationOrphanRepairService {
  private readonly logger = new Logger(GenerationOrphanRepairService.name);

  constructor(
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
    private readonly gate: GenerationStartGate,
  ) {}

  async repair(input: RepairOrphanGenerationsDto): Promise<OrphanRepairResult[]> {
    const seen = new Set<string>();
    const results: OrphanRepairResult[] = [];
    // One at a time: the batch is small and each step is a write to another service.
    for (const { jobId, ownerId } of input.jobs) {
      if (seen.has(jobId)) continue;
      seen.add(jobId);
      results.push({ jobId, outcome: await this.repairOne(jobId, ownerId) });
    }
    return results;
  }

  private async repairOne(jobId: string, ownerId: string): Promise<OrphanRepairOutcome> {
    if (this.gate.isAttaching(jobId) || (await this.publications.isJobReferenced(jobId))) {
      return 'IN_USE';
    }
    let status: string;
    try {
      status = (await this.generation.getPrivateState(jobId, ownerId)).status;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) return 'NOT_FOUND';
      throw error;
    }
    if (!ACTIVE_GENERATION_JOB_STATUSES.includes(status)) return 'ALREADY_FINISHED';
    // Re-check just before the write: a start may have attached it while the state was read.
    if (this.gate.isAttaching(jobId) || (await this.publications.isJobReferenced(jobId))) {
      return 'IN_USE';
    }
    await this.generation.cancel(jobId);
    this.logger.warn(`Cancelled orphan generation job ${jobId}`);
    return 'CANCELLED';
  }
}

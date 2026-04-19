import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BusinessException,
  EntityNotFoundException,
} from '../../../common/errors/business.exception';
import {
  DiscoveryRunStatus,
  type DiscoverySource,
  type ModelDiscoveryCandidate,
  type ModelDiscoveryRun,
} from '../../../generated/prisma';
import { DiscoveryManager } from '../managers/discovery.manager';
import { CandidateImportManager } from '../managers/candidate-import.manager';
import { DiscoveryCandidateRepository } from '../repositories/discovery-candidate.repository';
import { DiscoveryRunRepository } from '../repositories/discovery-run.repository';
import { DiscoverySourceRepository } from '../repositories/discovery-source.repository';
import type {
  ApproveCandidateInput,
  BulkApproveInput,
  CandidateFilter,
  DiscoveryTriggerInput,
  DiscoveryTriggerResult,
  PaginatedCandidates,
  PaginatedRuns,
  RunFilter,
} from '../types/discovery.types';

@Injectable()
export class DiscoveryJobService {
  private readonly logger = new Logger(DiscoveryJobService.name);

  constructor(
    private readonly sourceRepo: DiscoverySourceRepository,
    private readonly runRepo: DiscoveryRunRepository,
    private readonly candidateRepo: DiscoveryCandidateRepository,
    private readonly discoveryManager: DiscoveryManager,
    private readonly importManager: CandidateImportManager,
  ) {}

  async triggerRefresh(input: DiscoveryTriggerInput): Promise<DiscoveryTriggerResult> {
    const sources: DiscoverySource[] =
      input.sourceId !== undefined
        ? [await this.resolveSource(input.sourceId)]
        : await this.sourceRepo.findEnabled();

    if (sources.length === 0) {
      throw new BusinessException(
        'No enabled discovery sources available',
        'NO_ENABLED_SOURCES',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const primarySource = sources[0];
    if (primarySource === undefined) {
      throw new BusinessException(
        'No enabled discovery sources available',
        'NO_ENABLED_SOURCES',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const run = await this.runRepo.create({
      source: { connect: { id: primarySource.id } },
      status: DiscoveryRunStatus.RUNNING,
      isDryRun: input.isDryRun,
      triggeredBy: input.triggeredBy,
    });

    void this.executeAsync(run.id, sources, input.isDryRun);
    return { runId: run.id, status: run.status };
  }

  async listRuns(filter: RunFilter): Promise<PaginatedRuns> {
    return this.runRepo.findAll(filter);
  }

  async getRun(id: string): Promise<ModelDiscoveryRun> {
    const run = await this.runRepo.findById(id);
    if (run === null) {
      throw new EntityNotFoundException('DiscoveryRun', id);
    }
    return run;
  }

  async listCandidates(filter: CandidateFilter): Promise<PaginatedCandidates> {
    return this.candidateRepo.findAll(filter);
  }

  async approveCandidate(input: ApproveCandidateInput): Promise<ModelDiscoveryCandidate> {
    const result = await this.importManager.importCandidate(input);
    return result.candidate;
  }

  async rejectCandidate(candidateId: string, reason: string): Promise<ModelDiscoveryCandidate> {
    return this.importManager.rejectCandidate(candidateId, reason);
  }

  async bulkApprove(input: BulkApproveInput): Promise<{
    approved: number;
    duplicates: number;
    failed: number;
  }> {
    let approved = 0;
    let duplicates = 0;
    let failed = 0;
    for (const id of input.candidateIds) {
      try {
        const result = await this.importManager.importCandidate({ candidateId: id });
        if (result.candidate.status === 'IMPORTED') approved += 1;
        else if (result.candidate.status === 'DUPLICATE') duplicates += 1;
      } catch (error: unknown) {
        this.logger.warn(
          `bulk approve failed for ${id}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        failed += 1;
      }
    }
    return { approved, duplicates, failed };
  }

  private async executeAsync(
    runId: string,
    sources: DiscoverySource[],
    isDryRun: boolean,
  ): Promise<void> {
    let totalDiscovered = 0;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    try {
      for (const source of sources) {
        try {
          const result = await this.discoveryManager.runPipeline(source, runId, isDryRun);
          totalDiscovered += result.discovered;
          totalImported += result.imported;
          totalSkipped += result.skipped;
          totalFailed += result.failed;
          await this.sourceRepo.updateLastRun(source.id, new Date());
        } catch (error: unknown) {
          this.logger.error(
            `source ${source.name} pipeline failed: ${error instanceof Error ? error.message : 'unknown'}`,
          );
          totalFailed += 1;
        }
      }
      await this.runRepo.markCompleted(runId, {
        discovered: totalDiscovered,
        imported: totalImported,
        skipped: totalSkipped,
        failed: totalFailed,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown discovery failure';
      this.logger.error(`discovery run ${runId} failed: ${message}`);
      await this.runRepo.markFailed(runId, message);
    }
  }

  private async resolveSource(id: string): Promise<DiscoverySource> {
    const source = await this.sourceRepo.findById(id);
    if (source === null) {
      throw new EntityNotFoundException('DiscoverySource', id);
    }
    return source;
  }
}

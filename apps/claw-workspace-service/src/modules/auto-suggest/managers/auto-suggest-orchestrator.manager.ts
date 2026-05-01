import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionApprovalManager } from '../../ai-actions/managers/ai-action-approval.manager';
import { AutoSuggestRunRepository } from '../repositories/auto-suggest-run.repository';
import { SuggestionDeduplicationRepository } from '../repositories/suggestion-deduplication.repository';
import type {
  AutoSuggestJobType,
  AutoSuggestRunResult,
  CandidateSuggestion,
} from '../types/auto-suggest.types';

@Injectable()
export class AutoSuggestOrchestratorManager {
  private readonly logger = new Logger(AutoSuggestOrchestratorManager.name);

  constructor(
    private readonly runRepo: AutoSuggestRunRepository,
    private readonly dedupRepo: SuggestionDeduplicationRepository,
    private readonly approval: AiActionApprovalManager,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async runJob(
    jobType: AutoSuggestJobType,
    candidatesProvider: () => Promise<CandidateSuggestion[]>,
  ): Promise<AutoSuggestRunResult> {
    const startedAt = Date.now();
    const run = await this.runRepo.create({ jobType });
    void this.publishStarted(run.id, jobType);
    let candidateCount = 0;
    let suggestionsCreated = 0;
    try {
      const candidates = await candidatesProvider();
      candidateCount = candidates.length;
      suggestionsCreated = await this.processCandidates(jobType, candidates);
      const durationMs = Date.now() - startedAt;
      const completed = await this.runRepo.complete({
        id: run.id,
        status: 'COMPLETED',
        candidateCount,
        suggestionsCreated,
        durationMs,
        errorMessage: null,
      });
      void this.publishCompleted(run.id, jobType, candidateCount, suggestionsCreated, durationMs);
      return {
        runId: completed.id,
        jobType,
        status: completed.status,
        candidateCount,
        suggestionsCreated,
        durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      const durationMs = Date.now() - startedAt;
      await this.runRepo.complete({
        id: run.id,
        status: 'FAILED',
        candidateCount,
        suggestionsCreated,
        durationMs,
        errorMessage: message,
      });
      void this.publishFailed(run.id, jobType, message);
      this.logger.error(`auto-suggest job ${jobType} failed — ${message}`);
      return {
        runId: run.id,
        jobType,
        status: 'FAILED',
        candidateCount,
        suggestionsCreated,
        durationMs,
      };
    }
  }

  private async processCandidates(
    jobType: AutoSuggestJobType,
    candidates: CandidateSuggestion[],
  ): Promise<number> {
    const ttl = AppConfig.get().AUTO_SUGGEST_DEDUP_TTL_DAYS;
    let created = 0;
    for (const candidate of candidates) {
      try {
        const deduped = await this.dedupRepo.exists(
          candidate.userId,
          candidate.sourceObjectId,
          candidate.actionKind,
        );
        if (deduped) continue;
        await this.approval.enqueueSuggestion({
          userId: candidate.userId,
          connectorId: candidate.connectorId,
          provider: candidate.provider,
          actionKind: candidate.actionKind,
          draftPayload: candidate.draftPayload,
          generatedBy: candidate.generatedBy,
          sourceObjectId: candidate.sourceObjectId,
        });
        await this.dedupRepo.record(
          candidate.userId,
          candidate.sourceObjectId,
          candidate.actionKind,
          jobType,
          ttl,
        );
        created += 1;
      } catch (error) {
        this.logger.warn(
          `auto-suggest ${jobType}: candidate ${candidate.sourceObjectId} failed — ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
    return created;
  }

  private publishStarted(runId: string, jobType: AutoSuggestJobType): Promise<void> {
    return this.publish(EventPattern.WORKSPACE_AUTO_SUGGEST_TICK_STARTED, { runId, jobType });
  }

  private publishCompleted(
    runId: string,
    jobType: AutoSuggestJobType,
    candidateCount: number,
    suggestionsCreated: number,
    durationMs: number,
  ): Promise<void> {
    return this.publish(EventPattern.WORKSPACE_AUTO_SUGGEST_TICK_COMPLETED, {
      runId,
      jobType,
      candidateCount,
      suggestionsCreated,
      durationMs,
    });
  }

  private publishFailed(
    runId: string,
    jobType: AutoSuggestJobType,
    errorMessage: string,
  ): Promise<void> {
    return this.publish(EventPattern.WORKSPACE_AUTO_SUGGEST_TICK_FAILED, {
      runId,
      jobType,
      errorMessage,
    });
  }

  private async publish(pattern: EventPattern, payload: unknown): Promise<void> {
    try {
      await this.rabbitmq.publish(pattern, payload);
    } catch (error) {
      this.logger.warn(
        `auto-suggest event publish ${pattern} failed — ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }
}

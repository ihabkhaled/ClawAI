import { Injectable, NotFoundException } from '@nestjs/common';

import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import { ChatModelClient } from '../../models/chat-model.client';
import { ArticleFormatter } from '../managers/article-formatter';
import { RoleHealer } from '../managers/role-healer';
import {
  FORMAT_PASS_CAP_MICRO_USD,
  FORMAT_REQUEST_PREFIX,
  FORMAT_SKIPPED_ALREADY_PRETTY,
} from '../constants/format-prompt.constants';
import type { FormatPreviewDto, FormatPreviewResult } from '../dto/format-preview.dto';
import type { GenerationPipelineInput } from '../types/generation-pipeline.types';
import { isFormattedArticle } from '../utilities/is-formatted-article.utility';
import { waitBeforeRetry } from '../utilities/wait-before-retry.utility';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import { ThreadBudgetClient } from './thread-budget.client';

/**
 * Runs the FORMAT stage on an existing article for the owner's "Improve formatting with AI"
 * preview. There is no job row: one small budget (cap `FORMAT_PASS_CAP_MICRO_USD`) is reserved
 * under the caller's idempotency key like an edit review does, the pass runs with the same
 * guard and cheap model as inside a job, and the budget is closed at once. Nothing is stored here;
 * accepting the result goes through the normal revision and review path in threads-service.
 */
@Injectable()
export class FormatPreviewService {
  constructor(
    private readonly models: ChatModelClient,
    private readonly budgets: ThreadBudgetClient,
    private readonly repository: GenerationJobsRepository,
  ) {}

  async preview(dto: FormatPreviewDto): Promise<FormatPreviewResult> {
    const unchanged: FormatPreviewResult = {
      status: 'SKIPPED',
      code: FORMAT_SKIPPED_ALREADY_PRETTY,
      markdown: dto.draft.markdown,
      citations: dto.draft.citations,
    };
    const request = await this.requireParentRequest(dto);
    if (isFormattedArticle(dto.draft.markdown)) return unchanged;
    // threads-service never sends a key twice (its own table), so a refusal here is a real one.
    const budget = await this.budgets.reserve(
      dto.ownerId,
      `${FORMAT_REQUEST_PREFIX}${dto.idempotencyKey}`,
      FORMAT_PASS_CAP_MICRO_USD,
    );
    let status = GenerationBudgetCloseStatus.PLATFORM_FAILED;
    try {
      const outcome = await new ArticleFormatter({
        call: (input, healing, spec) => this.healer().call(input, healing, spec),
      }).format(this.pipelineInput(dto, budget.id, request), dto.draft);
      if (outcome.status === 'FORMATTED') status = GenerationBudgetCloseStatus.FINALIZED;
      return {
        status: outcome.status,
        code: outcome.code,
        markdown: outcome.draft.markdown,
        citations: outcome.draft.citations,
      };
    } catch (error: unknown) {
      if (error instanceof ThreadGenerationCancelledError)
        status = GenerationBudgetCloseStatus.RELEASED;
      throw error;
    } finally {
      try {
        await this.budgets.close(budget.id, status);
      } catch {
        // A close that fails is closed later by auth's stale-budget sweeper (12 h).
      }
    }
  }

  /** The owner's own generation: a missing one and another user's look the same (404). */
  private async requireParentRequest(
    dto: FormatPreviewDto,
  ): Promise<ReturnType<typeof enqueueGenerationSchema.parse>> {
    const parent = await this.repository.findRevisionParent(dto.parentJobId, dto.ownerId);
    const request = parent ? enqueueGenerationSchema.safeParse(parent.request) : null;
    if (!request?.success) throw new NotFoundException('Parent generation not found');
    return request.data;
  }

  private healerInstance: RoleHealer | undefined;

  private healer(): RoleHealer {
    this.healerInstance ??= new RoleHealer({
      generate: (request) => this.models.generate(request),
      record: () => Promise.resolve(),
      recordSpend: () => Promise.resolve(),
      throwIfCancelled: (input) => {
        if (input.signal?.aborted) throw new ThreadGenerationCancelledError();
        return Promise.resolve();
      },
      loadHealth: () => Promise.resolve(new Map()),
      loadDemoted: () => Promise.resolve(new Set<string>()),
      wait: waitBeforeRetry,
      now: () => Date.now(),
      random: () => Math.random(),
    });
    return this.healerInstance;
  }

  private pipelineInput(
    dto: FormatPreviewDto,
    budgetId: string,
    request: ReturnType<typeof enqueueGenerationSchema.parse>,
  ): GenerationPipelineInput {
    return {
      jobId: `${FORMAT_REQUEST_PREFIX}${dto.idempotencyKey}`,
      ownerId: dto.ownerId,
      budgetId,
      attempt: 1,
      correlationId: dto.correlationId,
      topic: dto.title,
      publicationType: dto.publicationType,
      contentLocale: dto.contentLocale,
      sourceSnapshot: {},
      authors: [],
      judge: request.judge,
      critic: request.judge,
      healing: request.healing,
      spendCapMicroUsd: FORMAT_PASS_CAP_MICRO_USD,
      spentMicroUsd: 0,
      formatStage: true,
    };
  }
}

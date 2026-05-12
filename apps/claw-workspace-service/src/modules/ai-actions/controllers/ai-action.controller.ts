import { Body, Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { AiActionApprovalManager } from '../managers/ai-action-approval.manager';
import { AiActionExecutionManager } from '../managers/ai-action-execution.manager';
import { AutoRouterManager } from '../managers/auto-router.manager';
import { MultiModelReviewOrchestratorManager } from '../managers/multi-model-review-orchestrator.manager';
import {
  type MultiModelReviewRequestDto,
  multiModelReviewRequestSchema,
} from '../dto/multi-model-review.dto';
import { type ResolveAiActionDto, resolveAiActionSchema } from '../dto/resolve-ai-action.dto';
import {
  type RunAiActionDto,
  type RunAiActionQueryDto,
  runAiActionQuerySchema,
  runAiActionSchema,
} from '../dto/run-ai-action.dto';
import type { MultiModelReviewResult } from '../types/multi-model-review.types';
import type {
  AiActionResult,
  AutoRouterResolution,
  RunAiActionEnvelope,
} from '../types/ai-action.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('workspace/ai-actions')
export class AiActionController {
  constructor(
    private readonly router: AutoRouterManager,
    private readonly execution: AiActionExecutionManager,
    private readonly approval: AiActionApprovalManager,
    private readonly multiModelReview: MultiModelReviewOrchestratorManager,
  ) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Body(new ZodValidationPipe(resolveAiActionSchema)) dto: ResolveAiActionDto,
  ): Promise<AutoRouterResolution> {
    return this.router.resolve({
      actionKind: dto.actionKind,
      privacyClass: dto.privacyClass,
      preferredModel: dto.preferredModel,
    });
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(runAiActionSchema)) dto: RunAiActionDto,
    @Query(new ZodValidationPipe(runAiActionQuerySchema)) query: RunAiActionQueryDto,
  ): Promise<RunAiActionEnvelope> {
    return this.runOrQueue(user, dto, query);
  }

  @Post('multi-model-review')
  @HttpCode(HttpStatus.OK)
  async multiModelReviewEndpoint(
    @Body(new ZodValidationPipe(multiModelReviewRequestSchema)) dto: MultiModelReviewRequestDto,
  ): Promise<MultiModelReviewResult> {
    return this.multiModelReview.run(dto);
  }

  private async runOrQueue(
    user: AuthenticatedUser,
    dto: RunAiActionDto,
    query: RunAiActionQueryDto,
  ): Promise<RunAiActionEnvelope> {
    if (query.execute === 'immediate') {
      const result = await this.executeNow(dto);
      return { mode: 'EXECUTED', execution: result };
    }
    const enqueue = await this.approval.enqueueSuggestion({
      userId: user.id,
      connectorId: dto.connectorId ?? null,
      provider: dto.provider ?? null,
      actionKind: dto.actionKind,
      draftPayload: { context: dto.context },
      sourceObjectId: dto.sourceObjectId ?? null,
    });
    return { mode: 'QUEUED', queue: enqueue };
  }

  private async executeNow(dto: RunAiActionDto): Promise<AiActionResult> {
    return this.execution.run({
      actionKind: dto.actionKind,
      privacyClass: dto.privacyClass,
      context: dto.context,
      preferredModel: dto.preferredModel,
    });
  }
}

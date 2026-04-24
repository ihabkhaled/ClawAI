import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { AiActionExecutionManager } from '../managers/ai-action-execution.manager';
import { AutoRouterManager } from '../managers/auto-router.manager';
import { type ResolveAiActionDto, resolveAiActionSchema } from '../dto/resolve-ai-action.dto';
import { type RunAiActionDto, runAiActionSchema } from '../dto/run-ai-action.dto';
import type { AiActionResult, AutoRouterResolution } from '../types/ai-action.types';

@Controller('workspace/ai-actions')
export class AiActionController {
  constructor(
    private readonly router: AutoRouterManager,
    private readonly execution: AiActionExecutionManager,
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
    @Body(new ZodValidationPipe(runAiActionSchema)) dto: RunAiActionDto,
  ): Promise<AiActionResult> {
    return this.execution.run({
      actionKind: dto.actionKind,
      privacyClass: dto.privacyClass,
      context: dto.context,
      preferredModel: dto.preferredModel,
    });
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { AutoRouterManager } from '../managers/auto-router.manager';
import { type ResolveAiActionDto, resolveAiActionSchema } from '../dto/resolve-ai-action.dto';
import type { AutoRouterResolution } from '../types/ai-action.types';

@Controller('workspace/ai-actions')
export class AiActionController {
  constructor(private readonly router: AutoRouterManager) {}

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
}

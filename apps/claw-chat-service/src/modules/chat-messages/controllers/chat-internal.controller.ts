import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { type InternalGenerateDto, internalGenerateSchema } from '../dto/internal-generate.dto';
import type { InternalGenerateResponse } from '../types/internal-generate.types';

@Controller('internal/chat')
export class ChatInternalController {
  constructor(private readonly execution: ChatExecutionManager) {}

  @Public()
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(
    @Body(new ZodValidationPipe(internalGenerateSchema)) dto: InternalGenerateDto,
  ): Promise<InternalGenerateResponse> {
    return this.execution.generateOnce(
      dto.provider,
      dto.model,
      dto.systemPrompt,
      dto.userPrompt,
      dto.maxTokens,
    );
  }
}

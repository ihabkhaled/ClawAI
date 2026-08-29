import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { type InternalGenerateDto, internalGenerateSchema } from '../dto/internal-generate.dto';
import type { InternalGenerateResponse } from '../types/internal-generate.types';
import { ModelAuthorizationMetricsService } from '../services/model-authorization-metrics.service';
import type { ModelAuthorizationMetricsSnapshot } from '../types/model-authorization-metrics.types';

@Controller('internal/chat')
export class ChatInternalController {
  constructor(
    private readonly execution: ChatExecutionManager,
    private readonly authorizationMetrics: ModelAuthorizationMetricsService,
  ) {}

  // Operator read of the model-authorization counters for this process. Kept
  // on the internal surface: the numbers say how much of the catalog is being
  // refused, which is inventory information users have no business reading.
  @Public()
  @Get('model-authorization-metrics')
  @HttpCode(HttpStatus.OK)
  modelAuthorizationMetrics(): ModelAuthorizationMetricsSnapshot {
    return this.authorizationMetrics.snapshot();
  }

  @Public()
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(
    @Body(new ZodValidationPipe(internalGenerateSchema)) dto: InternalGenerateDto,
  ): Promise<InternalGenerateResponse> {
    return this.execution.generateOnce(dto);
  }
}

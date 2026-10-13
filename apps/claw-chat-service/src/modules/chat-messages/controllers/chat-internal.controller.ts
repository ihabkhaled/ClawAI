import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { type InternalGenerateDto, internalGenerateSchema } from '../dto/internal-generate.dto';
import type { InternalGenerateResponse } from '../types/internal-generate.types';
import { ModelAuthorizationMetricsService } from '../services/model-authorization-metrics.service';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import type { ModelAuthorizationMetricsSnapshot } from '../types/model-authorization-metrics.types';
import { respondWithGenerateStream } from '../utilities/internal-generate-response.utility';

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
  @UseGuards(ServiceTokenGuard)
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(
    @Body(new ZodValidationPipe(internalGenerateSchema)) dto: InternalGenerateDto,
  ): Promise<InternalGenerateResponse> {
    return this.execution.generateOnce(dto);
  }

  /**
   * The same call as `generate`, answered as NDJSON so the caller can tell a
   * model that is still working from one that is stuck (ADR-175).
   *
   * Zero or more `{"type":"activity"}` lines, each written only when provider
   * bytes actually arrived, then exactly one terminal line: `result` (the same
   * object `generate` returns, plus `costMicroUsd` for a pay-as-you-go user) or
   * `error` (HTTP-style status, machine code, short message). Refusals that
   * happen before the handler runs (service token, body validation) are still
   * plain HTTP statuses.
   *
   * If the caller disconnects the provider call is aborted and the credit hold
   * is released, so a cancelled job stops spending within moments instead of
   * running to the provider's own timeout.
   */
  @Public()
  @UseGuards(ServiceTokenGuard)
  @Post('generate-stream')
  async generateStream(
    @Body(new ZodValidationPipe(internalGenerateSchema)) dto: InternalGenerateDto,
    @Res() response: Response,
  ): Promise<void> {
    await respondWithGenerateStream(response, (options) =>
      this.execution.generateOnceStream(dto, options),
    );
  }
}

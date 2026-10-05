import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type InternalFetchDto, internalFetchSchema } from '../dto/internal-fetch.dto';
import { FetchService } from '../services/fetch.service';
import type { ToolFetchView } from '../types/fetch.types';

/**
 * One page, read through the SAME chain as every other fetch (domain policy,
 * robots.txt, cache, escalation tiers, SSRF checks, ADR-121), for chat-service's
 * `web_fetch` tool. Before this, that tool called Ollama Cloud's hosted fetch and
 * bypassed all of it. Like `internal/research/runs`, the user JWT guard is lifted
 * and ServiceTokenGuard is the real check; the caller has applied the plan gate.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/research/fetch')
export class FetchInternalController {
  constructor(private readonly service: FetchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  fetch(
    @Body(new ZodValidationPipe(internalFetchSchema)) dto: InternalFetchDto,
  ): Promise<ToolFetchView> {
    const { userId, ...request } = dto;
    return this.service.fetchPageForTool(userId, request);
  }
}

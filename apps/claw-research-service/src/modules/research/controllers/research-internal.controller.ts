import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import {
  type InternalExecuteResearchDto,
  internalExecuteResearchSchema,
} from '../dto/internal-execute-research.dto';
import { ResearchManager } from '../managers/research.manager';
import type { ResearchRun } from '../../../generated/prisma';

/**
 * Runs research on behalf of a user, for chat-service.
 *
 * Chat research used to forward the END USER's bearer token to the user route,
 * which is gated ADMIN_SYSTEM_VIEW because it also backs the admin Research
 * Runs page. Every non-admin user got a 403, chat-service swallowed it to
 * "no evidence", and the answer ran without the web — while testing as an
 * admin showed everything working. Measured live 2026-09-18: 403 for an
 * ordinary user, 200 for the same user on /research/search-providers.
 *
 * The user route is deliberately NOT widened to RESEARCH_USE. research-service
 * records usage but never enforces the plan, so opening it would let any
 * signed-in user reach crawling directly and skip chat-service's paid-feature
 * gate. Instead the only non-admin path is this one, which only a sibling
 * service holding the shared token can call — after it has applied that gate.
 *
 * It also lets a background job run research: a RabbitMQ consumer holds no
 * user token, so the user route was unreachable from it entirely.
 *
 * `@Public()` lifts the user JWT guard only; ServiceTokenGuard does the real
 * check, and with no @RequirePermissions the PermissionGuard has nothing to
 * demand of a request that carries no user.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/research/runs')
export class ResearchInternalController {
  constructor(private readonly manager: ResearchManager) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  run(
    @Body(new ZodValidationPipe(internalExecuteResearchSchema)) dto: InternalExecuteResearchDto,
  ): Promise<ResearchRun> {
    const { userId, ...request } = dto;
    return this.manager.run(userId, request);
  }
}

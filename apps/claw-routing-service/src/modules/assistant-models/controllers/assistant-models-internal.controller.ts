import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { AssistantModelRole } from '../../../generated/prisma';
import { AssistantModelService } from '../services/assistant-model.service';
import type { AssistantModelCandidate } from '../types/assistant-model.types';

/**
 * The configured candidates for an assistant model role, for a sibling SERVICE.
 *
 * chat-service's research gate reads this instead of an environment variable,
 * so changing which model decides "does this turn need the web" is an admin
 * action rather than a redeploy.
 *
 * `@Public()` lifts the user JWT guard only; `ServiceTokenGuard` still does the
 * real check. Same shape as the router-models internal routes.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/assistant-models')
export class AssistantModelsInternalController {
  constructor(private readonly service: AssistantModelService) {}

  @Get(':role/candidates')
  async candidates(@Param('role') role: string): Promise<readonly AssistantModelCandidate[]> {
    return this.service.listCandidates(role as AssistantModelRole);
  }
}

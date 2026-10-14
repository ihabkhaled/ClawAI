import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import type { RecommendedTeamResponse } from '../types/recommended-team.types';
import { RecommendedTeamService } from '../services/recommended-team.service';

@Controller('thread-publications/recommended-team')
export class PublicationRecommendedTeamController {
  constructor(private readonly recommendedTeam: RecommendedTeamService) {}

  /** The caller's own plan-aware team and per-model availability; nothing of anyone else's. */
  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<RecommendedTeamResponse> {
    return this.recommendedTeam.get(user.id);
  }
}

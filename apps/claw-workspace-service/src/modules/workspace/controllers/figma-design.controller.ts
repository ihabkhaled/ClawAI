import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { FigmaDesignService } from '../services/figma-design.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { FigmaDesignAnalysis } from '../types/figma-api.types';

// v3 round 10 (Prompt 09) — exposes the Figma design analysis pipeline.
// A design-to-story AI action calls this to get a compact, AI-ready
// summary of a Figma file (pages / frames / text / components).
@Controller('workspace/figma')
export class FigmaDesignController {
  constructor(private readonly service: FigmaDesignService) {}

  @Get(':connectorId/files/:fileKey/analysis')
  @HttpCode(HttpStatus.OK)
  async analyze(
    @CurrentUser() user: AuthenticatedUser,
    @Param('connectorId') connectorId: string,
    @Param('fileKey') fileKey: string,
  ): Promise<FigmaDesignAnalysis> {
    return this.service.analyze(user.id, connectorId, fileKey);
  }
}

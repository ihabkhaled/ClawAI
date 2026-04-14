import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceConnectorService } from '../services/workspace-connector.service';
import { type OAuthInitDto, oauthInitSchema } from '../dto/oauth-init.dto';
import { type OAuthCallbackDto, oauthCallbackSchema } from '../dto/oauth-callback.dto';
import type { OAuthInitResult, WorkspaceConnectorWithStats } from '../types/workspace.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('workspace/oauth')
export class WorkspaceOAuthController {
  constructor(private readonly service: WorkspaceConnectorService) {}

  @Post('init')
  @HttpCode(HttpStatus.OK)
  async initOAuth(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(oauthInitSchema)) dto: OAuthInitDto,
  ): Promise<OAuthInitResult> {
    return this.service.initOAuth(user.id, dto);
  }

  @Get('callback')
  async handleCallback(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(oauthCallbackSchema)) dto: OAuthCallbackDto,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.handleOAuthCallback(user.id, dto);
  }
}

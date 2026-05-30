import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceConnectorService } from '../services/workspace-connector.service';
import { type OAuthInitDto, oauthInitSchema } from '../dto/oauth-init.dto';
import { type OAuthCallbackDto, oauthCallbackSchema } from '../dto/oauth-callback.dto';
import {
  type TestConnectionDto,
  testConnectionSchema,
  type TestPatDto,
  testPatSchema,
} from '../dto/test-connection.dto';
import type {
  HealthCheckResult,
  OAuthInitResult,
  WorkspaceConnectorWithStats,
} from '../types/workspace.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('workspace/oauth')
export class WorkspaceOAuthController {
  constructor(private readonly service: WorkspaceConnectorService) {}

  @Post('init')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.WORKSPACE_CONNECT_OWN)
  async initOAuth(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(oauthInitSchema)) dto: OAuthInitDto,
  ): Promise<OAuthInitResult> {
    return this.service.initOAuth(user.id, dto);
  }

  @Get('callback')
  @RequirePermissions(Permission.WORKSPACE_CONNECT_OWN)
  async handleCallback(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(oauthCallbackSchema)) dto: OAuthCallbackDto,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.handleOAuthCallback(user.id, dto);
  }

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.WORKSPACE_APP_CONFIG_VIEW)
  async testAppConfigConnection(
    @CurrentUser() _user: AuthenticatedUser,
    @Body(new ZodValidationPipe(testConnectionSchema)) dto: TestConnectionDto,
  ): Promise<HealthCheckResult> {
    return this.service.testAppConfigConnection(dto);
  }

  @Post('test-pat')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.WORKSPACE_CONNECT_OWN)
  async testPatToken(
    @CurrentUser() _user: AuthenticatedUser,
    @Body(new ZodValidationPipe(testPatSchema)) dto: TestPatDto,
  ): Promise<HealthCheckResult> {
    return this.service.testPat(dto);
  }
}

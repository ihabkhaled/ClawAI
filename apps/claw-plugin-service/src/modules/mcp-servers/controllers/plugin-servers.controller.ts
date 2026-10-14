import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import {
  type AuthenticatedUser,
  Permission,
  type PluginCredentialStatus,
} from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { SERVER_CACHE_CONTROL, SERVER_OUTBOUND_THROTTLE } from '../constants/mcp.constants';
import { SERVER_ID_PIPE } from '../constants/server-pipes.constants';
import {
  type ApproveChangesBody,
  approveChangesBodySchema,
  type RegisterServerBody,
  registerServerBodySchema,
  type ServerCredentialBody,
  serverCredentialBodySchema,
  type UpdateServerBody,
  updateServerBodySchema,
} from '../dto/mcp-server.dto';
import { McpServerReviewService } from '../services/mcp-server-review.service';
import { McpServersService } from '../services/mcp-servers.service';
import {
  type McpServerDetailView,
  type McpServerRefreshView,
  type McpServerRegisteredView,
  type McpServerView,
} from '../types/mcp-server-view.types';

/**
 * A user's own remote MCP servers. The owner is always the JWT user. Registering and refreshing
 * open a connection to a host the user named, so those two are rate limited per user.
 */
@Controller('plugins/servers')
export class PluginServersController {
  constructor(
    private readonly servers: McpServersService,
    private readonly review: McpServerReviewService,
  ) {}

  @Get()
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  list(@CurrentUser() user: AuthenticatedUser): Promise<McpServerView[]> {
    return this.servers.list(user.id);
  }

  @Post()
  @Throttle({ default: SERVER_OUTBOUND_THROTTLE })
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(registerServerBodySchema)) body: RegisterServerBody,
  ): Promise<McpServerRegisteredView> {
    return this.servers.register(user.id, body);
  }

  @Get(':id')
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', SERVER_ID_PIPE) id: string,
  ): Promise<McpServerDetailView> {
    return this.servers.get(user.id, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', SERVER_ID_PIPE) id: string,
    @Body(new ZodValidationPipe(updateServerBodySchema)) body: UpdateServerBody,
  ): Promise<McpServerDetailView> {
    return this.servers.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', SERVER_ID_PIPE) id: string,
  ): Promise<void> {
    return this.servers.remove(user.id, id);
  }

  @Put(':id/credential')
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  putCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', SERVER_ID_PIPE) id: string,
    @Body(new ZodValidationPipe(serverCredentialBodySchema)) body: ServerCredentialBody,
  ): Promise<PluginCredentialStatus> {
    return this.servers.putCredential(user.id, id, body);
  }

  @Delete(':id/credential')
  @HttpCode(204)
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  removeCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', SERVER_ID_PIPE) id: string,
  ): Promise<void> {
    return this.servers.removeCredential(user.id, id);
  }

  @Post(':id/refresh')
  @HttpCode(200)
  @Throttle({ default: SERVER_OUTBOUND_THROTTLE })
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', SERVER_ID_PIPE) id: string,
  ): Promise<McpServerRefreshView> {
    return this.review.refresh(user.id, id);
  }

  @Post(':id/approve-changes')
  @HttpCode(200)
  @RequirePermissions(Permission.PLUGINS_MANAGE_OWN_SERVERS)
  @Header('Cache-Control', SERVER_CACHE_CONTROL)
  approveChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', SERVER_ID_PIPE) id: string,
    @Body(new ZodValidationPipe(approveChangesBodySchema)) body: ApproveChangesBody,
  ): Promise<McpServerDetailView> {
    return this.review.approveChanges(user.id, id, body);
  }
}

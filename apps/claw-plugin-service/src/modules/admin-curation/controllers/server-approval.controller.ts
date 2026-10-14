import { Body, Controller, Get, Header, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AdminServerView, type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ADMIN_CACHE_CONTROL } from '../constants/curation.constants';
import {
  type RejectServerBody,
  rejectServerBodySchema,
  serverIdSchema,
  type ServersQuery,
  serversQuerySchema,
} from '../dto/curation.dto';
import { ServerApprovalService } from '../services/server-approval.service';

/** The approval queue for users' own MCP servers (PLUGINS_ADMIN). */
@RequirePermissions(Permission.PLUGINS_ADMIN)
@Controller('plugins/admin/servers')
export class ServerApprovalController {
  constructor(private readonly approvals: ServerApprovalService) {}

  @Get()
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  list(
    @Query(new ZodValidationPipe(serversQuerySchema)) query: ServersQuery,
  ): Promise<AdminServerView[]> {
    return this.approvals.list(query.status);
  }

  @Get(':id')
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  get(@Param('id', new ZodValidationPipe(serverIdSchema)) id: string): Promise<AdminServerView> {
    return this.approvals.get(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(serverIdSchema)) id: string,
  ): Promise<AdminServerView> {
    return this.approvals.approve(user.id, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(serverIdSchema)) id: string,
    @Body(new ZodValidationPipe(rejectServerBodySchema)) body: RejectServerBody,
  ): Promise<AdminServerView> {
    return this.approvals.reject(user.id, id, body.reason);
  }
}

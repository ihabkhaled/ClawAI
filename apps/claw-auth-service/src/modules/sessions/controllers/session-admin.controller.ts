import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Permission } from '@claw/shared-types';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types';
import {
  type ListSessionsQueryDto,
  listSessionsQuerySchema,
  type TerminateSessionDto,
  terminateSessionSchema,
} from '../dto/session-admin.dto';
import { SessionAdminService } from '../services/session-admin.service';
import type {
  ClearLogsResult,
  SessionListResult,
  TerminateResult,
} from '../types/session-admin.types';

/**
 * One account's logins, for administrators (ADR-204). Same gate as the rest of the users
 * admin surface: ADMIN role + ADMIN_USERS_MANAGE. The super-administrator shield and the
 * "your own current login needs a confirm" rule live in the service.
 */
@Controller('users')
export class SessionAdminController {
  constructor(private readonly sessions: SessionAdminService) {}

  @Get(':id/sessions')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async list(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(listSessionsQuerySchema)) query: ListSessionsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SessionListResult> {
    return this.sessions.list(id, query, actor);
  }

  @Post(':id/sessions/terminate-all')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async terminateAll(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(terminateSessionSchema)) dto: TerminateSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TerminateResult> {
    return this.sessions.terminateAll(id, dto, actor);
  }

  @Post(':id/sessions/:familyId/terminate')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async terminateOne(
    @Param('id') id: string,
    @Param('familyId') familyId: string,
    @Body(new ZodValidationPipe(terminateSessionSchema)) dto: TerminateSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TerminateResult> {
    return this.sessions.terminateOne(id, familyId, dto, actor);
  }

  @Delete(':id/sessions/logs')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async clearInactive(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ClearLogsResult> {
    return this.sessions.clearInactive(id, actor);
  }

  @Delete(':id/sessions/:familyId/log')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async clearOne(
    @Param('id') id: string,
    @Param('familyId') familyId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ClearLogsResult> {
    return this.sessions.clearOne(id, familyId, actor);
  }
}

import { Body, Controller, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Permission } from '@claw/shared-types';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types';
import {
  type GlobalChallengeDto,
  globalChallengeSchema,
  type GlobalClearDto,
  globalClearSchema,
  type GlobalTerminateDto,
  globalTerminateSchema,
} from '../dto/session-admin.dto';
import { SessionGlobalService } from '../services/session-global.service';
import type {
  ClearLogsResult,
  GlobalChallengeResult,
  TerminateResult,
} from '../types/session-admin.types';

/**
 * The system-wide session actions (ADR-204). ADMIN + ADMIN_USERS_MANAGE here, and the
 * service additionally requires the super administrator. The challenge reply carries a
 * one-time token, so it is `no-store`.
 */
@Controller('auth/session-security')
export class SessionGlobalController {
  constructor(private readonly global: SessionGlobalService) {}

  @Post('challenge')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async challenge(
    @Body(new ZodValidationPipe(globalChallengeSchema)) dto: GlobalChallengeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<GlobalChallengeResult> {
    return this.global.challenge(dto, actor);
  }

  @Post('terminate-all')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async terminateAll(
    @Body(new ZodValidationPipe(globalTerminateSchema)) dto: GlobalTerminateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TerminateResult> {
    return this.global.terminateEverything(dto, actor);
  }

  @Post('clear-logs')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async clearLogs(
    @Body(new ZodValidationPipe(globalClearSchema)) dto: GlobalClearDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ClearLogsResult> {
    return this.global.clearEverything(dto, actor);
  }
}

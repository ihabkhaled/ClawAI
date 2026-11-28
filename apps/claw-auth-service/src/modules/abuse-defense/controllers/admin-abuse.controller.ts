import { Controller, Get, Param } from '@nestjs/common';
import { Permission } from '@claw/shared-types';

import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type AdminAbuseParamDto, adminAbuseParamSchema } from '../dto/abuse-signal.dto';
import { AbuseAdminService } from '../services/abuse-admin.service';
import type { AdminAbuseView } from '../types/abuse-defense.types';

/**
 * One account's abuse standing for the users page (ADR-233). ADMIN role + ADMIN_USERS_MANAGE, the
 * permission that gates the page it is opened from. Read-only: a suspension is lifted with the
 * existing `POST /users/:id/unban`, which also lifts the account's banned-device marks.
 */
@Controller('admin/users')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_USERS_MANAGE)
export class AdminAbuseController {
  constructor(private readonly abuse: AbuseAdminService) {}

  @Get(':userId/abuse')
  async view(
    @Param(new ZodValidationPipe(adminAbuseParamSchema)) params: AdminAbuseParamDto,
  ): Promise<AdminAbuseView> {
    return this.abuse.view(params.userId);
  }
}

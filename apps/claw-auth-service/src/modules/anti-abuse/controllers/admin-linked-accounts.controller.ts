import { Controller, Get, Param } from '@nestjs/common';
import { Permission } from '@claw/shared-types';

import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type LinkedAccountsParamDto, linkedAccountsParamSchema } from '../dto/anti-abuse.dto';
import { LinkedAccountsService } from '../services/linked-accounts.service';
import type { LinkedAccountsView } from '../types/linked-accounts.types';

/**
 * Accounts that share a device or a registration network with one account
 * (anti-abuse, 2026-11-27). ADMIN role + ADMIN_USERS_MANAGE, the permission that
 * gates the users page this is opened from. Routed under the already-proxied
 * `/api/v1/admin` prefix, so no nginx change.
 */
@Controller('admin/users')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_USERS_MANAGE)
export class AdminLinkedAccountsController {
  constructor(private readonly linkedAccounts: LinkedAccountsService) {}

  @Get(':userId/linked-accounts')
  async list(
    @Param(new ZodValidationPipe(linkedAccountsParamSchema)) params: LinkedAccountsParamDto,
  ): Promise<LinkedAccountsView> {
    return this.linkedAccounts.list(params.userId);
  }
}

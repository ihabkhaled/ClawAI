import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Permission } from '@claw/shared-types';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types';
import {
  type CreateOpsTokenDto,
  createOpsTokenSchema,
  type OpsTokenIdParamDto,
  opsTokenIdParamSchema,
} from '../dto/ops-token.dto';
import { OpsTokenService } from '../services/ops-token.service';
import type { CreatedOpsToken, OpsTokenView } from '../types/ops-token.types';

/**
 * Admin management of read-only ops tokens. Listing needs ADMIN_SYSTEM_VIEW;
 * minting or revoking one grants access to every log, so it needs
 * ADMIN_PERMISSIONS_MANAGE. Routed under the proxied /api/v1/admin prefix.
 */
@Controller('admin/ops-tokens')
@Roles(UserRole.ADMIN)
export class AdminOpsTokenController {
  constructor(private readonly opsTokens: OpsTokenService) {}

  @Get()
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  async list(): Promise<OpsTokenView[]> {
    return this.opsTokens.list();
  }

  @Post()
  @RequirePermissions(Permission.ADMIN_PERMISSIONS_MANAGE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOpsTokenSchema)) dto: CreateOpsTokenDto,
  ): Promise<CreatedOpsToken> {
    return this.opsTokens.create(user.id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.ADMIN_PERMISSIONS_MANAGE)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(opsTokenIdParamSchema)) params: OpsTokenIdParamDto,
  ): Promise<OpsTokenView> {
    return this.opsTokens.revoke(params.id, user.id);
  }
}

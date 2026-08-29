import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { Permission } from '@claw/shared-types';

import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import {
  type SystemSettingKeyParamDto,
  systemSettingKeyParamSchema,
  type UpdateSystemSettingDto,
  updateSystemSettingSchema,
} from '../dto/system-setting.dto';
import { SystemSettingService } from '../services/system-setting.service';
import { type SystemSettingView } from '../types/system-setting.types';

/**
 * Operator access to platform settings, including the PAYG kill switch.
 *
 * Reading is `ADMIN_SYSTEM_VIEW` and writing is `ADMIN_CREDIT_MANAGE`: the only
 * setting this endpoint currently governs decides whether real money is
 * metered, so seeing the switch and flipping it are deliberately different
 * grants. Routed under the already-proxied `/api/v1/admin` prefix.
 */
@Controller('admin/settings')
@Roles(UserRole.ADMIN)
export class AdminSystemSettingController {
  constructor(private readonly settings: SystemSettingService) {}

  @Get()
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  async list(): Promise<SystemSettingView[]> {
    return this.settings.list();
  }

  @Get(':key')
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  async get(
    @Param(new ZodValidationPipe(systemSettingKeyParamSchema)) params: SystemSettingKeyParamDto,
  ): Promise<SystemSettingView | null> {
    return this.settings.find(params.key);
  }

  @Put(':key')
  @RequirePermissions(Permission.ADMIN_CREDIT_MANAGE)
  async set(
    @Param(new ZodValidationPipe(systemSettingKeyParamSchema)) params: SystemSettingKeyParamDto,
    @Body(new ZodValidationPipe(updateSystemSettingSchema)) dto: UpdateSystemSettingDto,
  ): Promise<SystemSettingView> {
    return this.settings.set(params.key, dto.value);
  }
}

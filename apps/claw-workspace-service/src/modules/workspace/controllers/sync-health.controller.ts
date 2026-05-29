import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '@claw/shared-auth';
import { Permission, UserRole } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';

import { SyncHealthService } from '../services/sync-health.service';
import type { SyncHealthDashboard } from '../types/sync-health.types';

@Controller('workspace/sync')
export class SyncHealthController {
  constructor(private readonly service: SyncHealthService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_WORKSPACES_VIEW)
  async getDashboard(): Promise<SyncHealthDashboard> {
    return this.service.getDashboard();
  }
}

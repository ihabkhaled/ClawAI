import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '@claw/shared-auth';
import { UserRole } from '@claw/shared-types';

import { SyncHealthService } from '../services/sync-health.service';
import type { SyncHealthDashboard } from '../types/sync-health.types';

@Controller('workspace/sync')
export class SyncHealthController {
  constructor(private readonly service: SyncHealthService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async getDashboard(): Promise<SyncHealthDashboard> {
    return this.service.getDashboard();
  }
}

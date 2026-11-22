import { Module } from '@nestjs/common';

import { LivePolicyAdminController } from '../policy/controllers/live-policy-admin.controller';
import { LivePolicyAdminRepository } from '../policy/repositories/live-policy-admin.repository';
import { LivePolicyAdminService } from '../policy/services/live-policy-admin.service';
import { AdminController } from './controllers/admin.controller';
import { AdminOverviewRepository } from './repositories/admin-overview.repository';
import { AdminOverviewService } from './services/admin-overview.service';

/** Admin overview, emergency stop and the versioned policy routes (ADMIN_LIVE_MANAGE). */
@Module({
  controllers: [AdminController, LivePolicyAdminController],
  providers: [
    AdminOverviewRepository,
    AdminOverviewService,
    LivePolicyAdminRepository,
    LivePolicyAdminService,
  ],
})
export class AdminModule {}

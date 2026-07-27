import { Controller, Post } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ReconciliationManager } from '../managers/reconciliation.manager';
import type { ReconciliationCounts } from '../types/reconciliation.types';

@Controller('admin/billing/reconciliation')
@RequirePermissions(Permission.ADMIN_PLANS_MANAGE)
export class ReconciliationAdminController {
  constructor(private readonly reconciliation: ReconciliationManager) {}

  @Post()
  async run(): Promise<ReconciliationCounts | null> {
    return this.reconciliation.reconcile();
  }
}

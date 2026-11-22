import { Injectable } from '@nestjs/common';

import type { LiveViewerSession } from '../../../generated/prisma';
import { BillingService } from '../../billing/services/billing.service';
import type { LiveSessionUsageView } from '../types/live-session.types';

/** Builds the usage block every session response carries. Money stays integer micro-USD. */
@Injectable()
export class LiveSessionPresenterManager {
  constructor(private readonly billing: BillingService) {}

  async usage(session: LiveViewerSession): Promise<LiveSessionUsageView> {
    return {
      billedSeconds: session.billedSeconds,
      pendingSeconds: session.pendingSeconds,
      spentMicroUsd: Number(session.spentMicroUsd),
      paidApproved: session.paidApprovedAt !== null,
      spendingCapMicroUsd:
        session.spendingCapMicroUsd === null ? null : Number(session.spendingCapMicroUsd),
      month: await this.billing.usage(session.userId),
    };
  }
}

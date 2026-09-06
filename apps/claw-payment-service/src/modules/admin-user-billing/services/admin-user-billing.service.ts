import { Injectable, Logger } from '@nestjs/common';
import { type AdminUserSubscriptionStatistics } from '@claw/shared-types';

import { InvoiceRepository } from '../../subscriptions/repositories/invoice.repository';
import { SubscriptionRepository } from '../../subscriptions/repositories/subscription.repository';
import { ADMIN_USER_RECENT_INVOICE_LIMIT } from '../constants/admin-user-billing.constants';
import { adminUserSubscriptionStatisticsSchema } from '../schemas/admin-user-billing-response.schema';
import { toAdminUserSubscriptionStatisticsDraft } from '../utilities/admin-user-billing-view.utility';

/**
 * Read side of ONE user's billing state, for an admin.
 *
 * Read-only by construction: it holds no write repository, so this surface
 * cannot move a user onto a plan. Everything is scoped by the userId in the
 * path, which the permission guard has already established the caller is
 * allowed to ask about.
 */
@Injectable()
export class AdminUserBillingService {
  private readonly logger = new Logger(AdminUserBillingService.name);

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly invoices: InvoiceRepository,
  ) {}

  /**
   * The user's subscription, history and money-paid figures in one call.
   *
   * A user with no subscription is not an error: `subscription` is null, which
   * is what every free account looks like. A 404 here would make the most
   * common state read as a failure.
   */
  async getSubscriptionStatistics(
    userId: string,
    now: Date = new Date(),
  ): Promise<AdminUserSubscriptionStatistics> {
    this.logger.debug(`getSubscriptionStatistics: user=${userId}`);
    const [current, history, paidInvoices, recentInvoices] = await Promise.all([
      this.subscriptions.findActiveByUserId(userId),
      this.subscriptions.findAllByUserId(userId),
      this.invoices.listPaidForUser(userId),
      this.invoices.listForUser(userId, ADMIN_USER_RECENT_INVOICE_LIMIT),
    ]);
    const draft = toAdminUserSubscriptionStatisticsDraft({
      userId,
      generatedAt: now,
      current,
      history,
      paidInvoices,
      recentInvoices,
    });
    return adminUserSubscriptionStatisticsSchema.parse(draft);
  }
}

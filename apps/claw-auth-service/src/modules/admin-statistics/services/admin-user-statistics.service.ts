import { Injectable, Logger } from '@nestjs/common';
import {
  type AdminCreditMonthConsumption,
  type AdminUsageTokenWindow,
  type AdminUserUsageStatistics,
} from '@claw/shared-types';

import { CreditLedgerRepository } from '../../credit/repositories/credit-ledger.repository';
import { type CreditMonthConsumptionRow } from '../../credit/types/credit.types';
import { TokenLedgerRepository } from '../../quota/repositories/token-ledger.repository';
import { type UsageDateRange } from '../../entitlements/types/usage-view.types';
import { buildUsageDateRanges } from '../../entitlements/utilities/usage-date-range.utility';
import { buildPeriodKeys } from '../../quota/utilities/quota-reservation.utility';
import { ADMIN_CREDIT_CONSUMPTION_MONTHS } from '../constants/admin-user-statistics.constants';
import { buildCreditMonthWindowStart } from '../utilities/credit-month-window.utility';

/**
 * What one account has actually consumed, for an operator looking at the admin
 * users page.
 *
 * The operator-facing counterpart of `UsageViewService`. That one reports
 * headroom (used against limit, remaining) because a user wants to know what
 * they have left; this one reports the traffic itself (input/output split,
 * request count, settled spend by month) because an operator is answering a
 * different question — usually "why is this bill what it is".
 *
 * Read-only and reservation-free, like its sibling: opening an admin panel must
 * never consume the quota of the account being inspected.
 *
 * It deliberately does NOT verify that `userId` names an existing user. The
 * ledgers are the source of truth for consumption, and an id with no rows is
 * indistinguishable from a real user who has never spent anything — both are
 * honestly reported as zero. Existence is the users endpoint's question.
 */
@Injectable()
export class AdminUserStatisticsService {
  private readonly logger = new Logger(AdminUserStatisticsService.name);

  constructor(
    private readonly tokens: TokenLedgerRepository,
    private readonly credits: CreditLedgerRepository,
  ) {}

  async getUsageForUser(userId: string): Promise<AdminUserUsageStatistics> {
    this.logger.debug(`getUsageForUser: ${userId}`);
    const now = new Date();
    const ranges = buildUsageDateRanges(now);
    const periods = buildPeriodKeys(now);
    const from = buildCreditMonthWindowStart(now, ADMIN_CREDIT_CONSUMPTION_MONTHS);

    const [day, week, month, creditRows] = await Promise.all([
      this.readWindow(userId, ranges.day, periods.dayKey),
      this.readWindow(userId, ranges.week, periods.weekKey),
      this.readWindow(userId, ranges.month, periods.monthKey),
      this.credits.aggregateMonthlyConsumption({ userId, from }),
    ]);

    return {
      userId,
      generatedAt: now.toISOString(),
      tokens: { day, week, month },
      creditsByMonth: creditRows.map(AdminUserStatisticsService.toMonthView),
    };
  }

  private async readWindow(
    userId: string,
    range: UsageDateRange,
    periodKey: string,
  ): Promise<AdminUsageTokenWindow> {
    const totals = await this.tokens.sumUsageBreakdown({ userId, ...range });
    return { periodKey, fromDate: range.fromDate, throughDate: range.throughDate, ...totals };
  }

  // BigInt never leaves this process as a number: JSON has no integer type wide
  // enough to promise micro-USD survives the trip, and a wallet figure that
  // silently loses its last digits is the exact class of bug the integer money
  // rule exists to prevent.
  private static toMonthView(row: CreditMonthConsumptionRow): AdminCreditMonthConsumption {
    return {
      monthKey: row.monthKey,
      consumedMicroUsd: row.consumedMicroUsd.toString(),
      entryCount: Number(row.entryCount),
    };
  }
}

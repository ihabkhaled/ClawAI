// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)
// Monthly cron — resets every UserCostBudget where resetAt <= now.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BudgetResetManager {
  private readonly logger = new Logger(BudgetResetManager.name);

  @Cron(CronExpression.EVERY_HOUR)
  async tick(): Promise<void> {
    this.logger.warn('BudgetResetManager.tick: SCAFFOLD only');
    throw new Error('SCAFFOLD-R4 — BudgetResetManager.tick not implemented');
  }
}

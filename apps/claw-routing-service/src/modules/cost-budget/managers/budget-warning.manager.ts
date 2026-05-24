// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BudgetWarningManager {
  private readonly logger = new Logger(BudgetWarningManager.name);

  async checkAndEmitWarning(_budgetId: string, _currentSpendUsd: number, _capUsd: number): Promise<void> {
    this.logger.warn('BudgetWarningManager.checkAndEmitWarning: SCAFFOLD-R4 only');
    throw new Error('SCAFFOLD-R4 — BudgetWarningManager.checkAndEmitWarning not implemented');
  }
}

// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)
// Pre-routing budget check.

import { Injectable, Logger } from '@nestjs/common';

import type { BudgetCheckInput, BudgetCheckResult } from '../types/budget.types';

@Injectable()
export class BudgetGateManager {
  private readonly logger = new Logger(BudgetGateManager.name);

  async check(_input: BudgetCheckInput): Promise<BudgetCheckResult> {
    this.logger.warn('BudgetGateManager.check: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R4 — BudgetGateManager.check not implemented; see docs/15-ai-context/routing-flagship-streams/05-r4-cost-budget-intelligence.md',
    );
  }
}

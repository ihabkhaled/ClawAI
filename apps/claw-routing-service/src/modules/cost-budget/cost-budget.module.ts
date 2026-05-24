// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)
// NEW module — NOT yet registered in app.module.ts.

import { Module } from '@nestjs/common';

import { CostBudgetController } from './controllers/cost-budget.controller';
import { BudgetGateManager } from './managers/budget-gate.manager';
import { BudgetResetManager } from './managers/budget-reset.manager';
import { BudgetWarningManager } from './managers/budget-warning.manager';
import { SpendTrackerManager } from './managers/spend-tracker.manager';
import { UserCostBudgetRepository } from './repositories/user-cost-budget.repository';
import { CostBudgetService } from './services/cost-budget.service';

@Module({
  controllers: [CostBudgetController],
  providers: [
    CostBudgetService,
    BudgetGateManager,
    SpendTrackerManager,
    BudgetWarningManager,
    BudgetResetManager,
    UserCostBudgetRepository,
  ],
  exports: [CostBudgetService, BudgetGateManager, SpendTrackerManager],
})
export class CostBudgetModule {}

// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)

export type BudgetScope = 'USER' | 'ORG';
export type BudgetStatus = 'OK' | 'WARN' | 'EXCEEDED';

export type BudgetCheckInput = {
  userId: string;
  orgId?: string;
  estimatedCostUsd: number;
};

export type BudgetCheckResult = {
  status: BudgetStatus;
  remainingUsd: number;
  percentOfCap: number;
  overrideAllowed: boolean;
  blockingScope?: BudgetScope;
};

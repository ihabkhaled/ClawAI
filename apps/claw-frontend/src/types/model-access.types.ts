import type { CostClass } from '@/enums/router-models.enum';

// The plan-access check for the model picker (POST /chat-messages/model-access).
export type ModelAccessRequestEntry = {
  provider: string;
  model: string;
};

export type ModelAccessEntry = ModelAccessRequestEntry & {
  /** May the signed-in user choose this model as the primary? */
  allowed: boolean;
  /** Price band. Absent: show no mark. */
  costClass?: CostClass;
  /** false: spends PAYG credit or exceeds the free-allowance price limit. Absent: do not dim. */
  coveredByAllowance?: boolean;
};

/** What the picker needs to mark and dim one model. Both fields optional. */
export type ModelCostInfo = {
  costClass?: CostClass;
  coveredByAllowance?: boolean;
};

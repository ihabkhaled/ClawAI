import { CostClass } from '@/enums/router-models.enum';

/** Short band word shown on a picker row. Bands only: never a rate or amount (rules/37). */
export const MODEL_COST_CLASS_LABEL_KEYS: Readonly<Record<CostClass, string>> = {
  [CostClass.FREE]: 'chat.modelSelector.cost.free',
  [CostClass.CHEAP]: 'chat.modelSelector.cost.cheap',
  [CostClass.STANDARD]: 'chat.modelSelector.cost.standard',
  [CostClass.PREMIUM]: 'chat.modelSelector.cost.premium',
  [CostClass.ULTRA]: 'chat.modelSelector.cost.ultra',
};

/** Tooltip sentence per band. */
export const MODEL_COST_CLASS_HINT_KEYS: Readonly<Record<CostClass, string>> = {
  [CostClass.FREE]: 'chat.modelSelector.cost.freeHint',
  [CostClass.CHEAP]: 'chat.modelSelector.cost.cheapHint',
  [CostClass.STANDARD]: 'chat.modelSelector.cost.standardHint',
  [CostClass.PREMIUM]: 'chat.modelSelector.cost.premiumHint',
  [CostClass.ULTRA]: 'chat.modelSelector.cost.ultraHint',
};

/** Appended to the tooltip when the model is outside the free allowance. */
export const MODEL_OUTSIDE_ALLOWANCE_HINT_KEY = 'chat.modelSelector.cost.outsideAllowanceHint';

/** Filled pips out of five per band: a glyph that is not colour alone. */
export const MODEL_COST_CLASS_PIPS: Readonly<Record<CostClass, number>> = {
  [CostClass.FREE]: 0,
  [CostClass.CHEAP]: 1,
  [CostClass.STANDARD]: 2,
  [CostClass.PREMIUM]: 3,
  [CostClass.ULTRA]: 4,
};

export const MODEL_COST_CLASS_PIP_COUNT = 4;
